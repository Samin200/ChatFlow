import React from "react";

export default function ChatSkeleton({ count = 6, chatSide = "default" }) {
  // Generate a random-ish pattern of left/right bubbles
  const patterns = [
    { isMine: false, width: "w-2/3" },
    { isMine: false, width: "w-1/2" },
    { isMine: true, width: "w-3/4" },
    { isMine: true, width: "w-1/3" },
    { isMine: false, width: "w-3/4" },
    { isMine: true, width: "w-1/2" },
    { isMine: false, width: "w-2/3" },
    { isMine: false, width: "w-1/3" },
  ];

  return (
    <div className="flex-1 flex flex-col justify-end p-4 md:p-6 space-y-4 overflow-hidden pointer-events-none w-full">
      {Array.from({ length: count }).map((_, i) => {
        const pattern = patterns[i % patterns.length];
        
        // If chatSide is "left", force all to the left
        const isMine = chatSide === "left" ? false : pattern.isMine;
        
        return (
          <div 
            key={`skeleton-${i}`} 
            className={`flex w-full ${isMine ? "justify-end" : "justify-start"}`}
          >
            <div className={`flex gap-3 w-full max-w-[85%] md:max-w-[75%] ${isMine ? "flex-row-reverse" : "flex-row"}`}>
              {/* Avatar placeholder */}
              {(!isMine || chatSide === "left") && (
                <div className="w-8 h-8 rounded-full bg-white/5 animate-pulse shrink-0" />
              )}
              
              {/* Bubble placeholder */}
              <div className={`flex flex-col gap-2 ${pattern.width}`}>
                <div className={`h-12 rounded-2xl bg-white/5 animate-pulse ${
                  isMine 
                    ? "rounded-tr-sm bg-white/10" 
                    : "rounded-tl-sm"
                }`} />
                {/* Meta placeholder (time) */}
                <div className={`h-3 w-12 rounded bg-white/5 animate-pulse ${
                  isMine ? "self-end" : "self-start"
                }`} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
