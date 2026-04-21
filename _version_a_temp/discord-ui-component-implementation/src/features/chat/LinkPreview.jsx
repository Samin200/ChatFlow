import { ExternalLink } from "lucide-react";

export default function LinkPreview({ preview }) {
  if (!preview || !preview.title) return null;

  return (
    <a
      href={preview.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block mt-2 rounded-xl overflow-hidden border border-white/10 bg-white/5 hover:bg-white/10 transition-colors group/link"
    >
      {preview.image && (
        <div className="relative aspect-[16/9] w-full overflow-hidden border-b border-white/10">
          <img
            src={preview.image}
            alt={preview.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover/link:scale-105"
          />
        </div>
      )}
      <div className="p-3">
        {preview.siteName && (
          <p className="text-[10px] uppercase tracking-wider font-bold text-teal-400 mb-1">
            {preview.siteName}
          </p>
        )}
        <h3 className="text-sm font-semibold leading-snug text-slate-100 line-clamp-2 group-hover/link:text-teal-300 transition-colors">
          {preview.title}
        </h3>
        {preview.description && (
          <p className="mt-1 text-xs text-slate-400 line-clamp-2 leading-relaxed">
            {preview.description}
          </p>
        )}
        <div className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-500">
          <ExternalLink className="w-3 h-3" />
          <span className="truncate">{new URL(preview.url).hostname}</span>
        </div>
      </div>
    </a>
  );
}
