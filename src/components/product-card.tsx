import { Link } from "@tanstack/react-router";
import { SignedImage } from "@/components/signed-image";
import { formatMoney } from "@/lib/format";

interface Props {
  id: string;
  name: string;
  priceCents: number;
  currency: string;
  image?: string;
  subtitle?: string | null;
  offset?: boolean;
}

export function ProductCard({ id, name, priceCents, currency, image, subtitle, offset }: Props) {
  return (
    <Link
      to="/product/$id"
      params={{ id }}
      className={`group block cursor-pointer ${offset ? "translate-y-8" : ""}`}
    >
      <div className="w-full aspect-[4/5] bg-stone-100 outline-1 -outline-offset-1 outline-black/5 flex items-center justify-center overflow-hidden mb-4 relative">
        <SignedImage
          src={image}
          alt={name}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
        />
        <span className="absolute bottom-2 left-2 text-[10px] uppercase tracking-widest text-background bg-foreground/70 px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
          Quick Shop
        </span>
      </div>
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-xs font-medium uppercase tracking-wider mb-1">{name}</h3>
          {subtitle ? <p className="font-mono text-[10px] text-muted-foreground">{subtitle}</p> : null}
        </div>
        <span className="text-xs font-medium">{formatMoney(priceCents, currency)}</span>
      </div>
    </Link>
  );
}
