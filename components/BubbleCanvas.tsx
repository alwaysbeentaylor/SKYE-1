import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { User, UserRole, UserStatus } from '../types';
import { Trash2 } from 'lucide-react';

interface BubbleCanvasProps {
  members: User[];
  currentUser: User;
  onMemberClick: (user: User) => void;
  onDeleteDrop?: (user: User) => void;
}

interface Node extends d3.SimulationNodeDatum {
  id: string;
  r: number; // radius
  user: User;
  x?: number;
  y?: number;
}

const BubbleCanvas: React.FC<BubbleCanvasProps> = ({ members, currentUser, onMemberClick, onDeleteDrop }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const simulationRef = useRef<d3.Simulation<Node, undefined> | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const width = window.innerWidth;
    const height = window.innerHeight;
    const isParent = currentUser.role === UserRole.PARENT;

    // Prepare nodes
    const nodes: Node[] = members
      .filter(m => m.id !== currentUser.id) // Don't show self
      .map(m => ({
        id: m.id,
        r: m.role === UserRole.PARENT ? 65 : 50, // Slightly larger
        user: m,
        x: width / 2 + (Math.random() - 0.5) * 50,
        y: height / 2 + (Math.random() - 0.5) * 50,
      }));

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous

    // Define Gradients
    const defs = svg.append("defs");
    
    // Shine Gradient
    const shine = defs.append("radialGradient")
        .attr("id", "shine")
        .attr("cx", "30%")
        .attr("cy", "30%")
        .attr("r", "70%");
    shine.append("stop").attr("offset", "0%").attr("stop-color", "rgba(255,255,255,0.6)");
    shine.append("stop").attr("offset", "100%").attr("stop-color", "rgba(255,255,255,0)");

    nodes.forEach(node => {
      const gradId = `grad-${node.id}`;
      const gradient = defs.append("linearGradient")
        .attr("id", gradId)
        .attr("x1", "0%")
        .attr("y1", "0%")
        .attr("x2", "100%")
        .attr("y2", "100%");
      
      gradient.append("stop").attr("offset", "0%").attr("stop-color", node.user.colorFrom);
      gradient.append("stop").attr("offset", "100%").attr("stop-color", node.user.colorTo);
    });

    // Physics Simulation
    const simulation = d3.forceSimulation<Node>(nodes)
      .force("charge", d3.forceManyBody().strength(-40)) // Repel
      .force("center", d3.forceCenter(width / 2, height / 2).strength(0.04)) // Pull to center
      .force("collide", d3.forceCollide().radius((d: any) => d.r + 10).iterations(3))
      .force("y", d3.forceY(height/2).strength(0.02))
      .force("x", d3.forceX(width/2).strength(0.02));
    
    simulationRef.current = simulation;

    // Render Group
    const nodeGroup = svg.append("g")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .attr("class", "cursor-pointer touch-none transition-transform duration-200");

    // Main Bubble Circle
    nodeGroup.append("circle")
      .attr("r", d => d.r)
      .attr("fill", d => `url(#grad-${d.id})`)
      .attr("stroke", "rgba(255,255,255,0.6)")
      .attr("stroke-width", 3)
      .attr("class", "shadow-2xl filter drop-shadow-2xl");

    // Glossy Overlay (Top Shine)
    nodeGroup.append("circle")
      .attr("r", d => d.r)
      .attr("fill", "url(#shine)")
      .style("pointer-events", "none");

    // Avatar/Emoji
    nodeGroup.append("text")
      .text(d => d.user.avatar || "?")
      .attr("text-anchor", "middle")
      .attr("dy", "0.1em")
      .attr("font-size", d => d.r * 0.8)
      .style("pointer-events", "none")
      .style("filter", "drop-shadow(0px 2px 4px rgba(0,0,0,0.2))");

    // Name Label (Floating below)
    nodeGroup.append("text")
      .text(d => d.user.name)
      .attr("text-anchor", "middle")
      .attr("dy", d => d.r + 25)
      .attr("fill", "white")
      .attr("font-weight", "800")
      .attr("font-size", "16px")
      .style("text-shadow", "0 2px 6px rgba(0,0,0,0.3)")
      .style("pointer-events", "none");

    // Status Indicator (Heartbeat)
    nodeGroup.each(function(d) {
      if (d.user.status === UserStatus.ONLINE) {
        d3.select(this).append("circle")
          .attr("r", 8)
          .attr("cx", d.r * 0.707)
          .attr("cy", -d.r * 0.707)
          .attr("fill", "#4ade80") // Green-400
          .attr("stroke", "white")
          .attr("stroke-width", 2)
          .attr("class", "animate-pulse");
      }
    });

    // Drag Behavior
    const drag = d3.drag<SVGGElement, Node>()
      .on("start", (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
        setDragActive(true);
      })
      .on("drag", (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on("end", (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
        setDragActive(false);

        if (isParent && onDeleteDrop && event.y > height - 100 && Math.abs(event.x - width/2) < 50) {
            onDeleteDrop(d.user);
        }
      });

    nodeGroup.call(drag);
    
    nodeGroup.on("click", (event, d) => {
        if (event.defaultPrevented) return;
        onMemberClick(d.user);
    });

    simulation.on("tick", () => {
      nodeGroup.attr("transform", d => `translate(${d.x},${d.y})`);
    });

    return () => {
      simulation.stop();
    };
  }, [members, currentUser, onMemberClick]);

  return (
    <div className="relative w-full h-full overflow-hidden">
       {/* Background Clouds/Blobs - Adjusted for SKYE theme */}
       <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
         <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-sky-300/30 rounded-full mix-blend-overlay filter blur-3xl animate-blob"></div>
         <div className="absolute top-[20%] right-[-20%] w-[500px] h-[500px] bg-white/20 rounded-full mix-blend-overlay filter blur-3xl animate-blob animation-delay-2000"></div>
         <div className="absolute bottom-[-10%] left-[10%] w-80 h-80 bg-blue-300/30 rounded-full mix-blend-overlay filter blur-3xl animate-blob animation-delay-4000"></div>
       </div>

      <svg ref={svgRef} className="w-full h-full z-10 relative" />
      
      {/* Trash Zone */}
      {currentUser.role === UserRole.PARENT && dragActive && (
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 w-24 h-24 border-2 border-red-400/50 bg-red-500/20 rounded-full flex items-center justify-center backdrop-blur-sm transition-all animate-pulse">
          <Trash2 className="text-white w-10 h-10" />
        </div>
      )}

      {/* Header */}
      <div className="absolute top-4 left-6 flex flex-col gap-1 pointer-events-none z-20">
        <h1 className="text-3xl font-black text-white drop-shadow-md tracking-tight italic">SKYE</h1>
        <div className="flex items-center gap-2 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full w-fit">
           <div className={`w-2 h-2 rounded-full ${currentUser.status === 'ONLINE' ? 'bg-green-400' : 'bg-gray-400'}`}></div>
           <span className="text-sm text-white font-bold shadow-sm">{currentUser.name}</span>
        </div>
      </div>
    </div>
  );
};

export default BubbleCanvas;
