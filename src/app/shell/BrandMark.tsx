import markImage from "@/assets/brand/mark.png";

export function BrandMark({ className = "size-4" }: { className?: string }) {
  return (
    <img
      src={markImage}
      alt="Morrow Agent"
      draggable={false}
      className={`shrink-0 select-none rounded-full object-cover ${className}`}
    />
  );
}
