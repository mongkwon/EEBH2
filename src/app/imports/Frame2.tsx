import imgPalette1 from "figma:asset/3ea778168688238f126a5986cfe1fe339ca1039e.png";
import imgPalette2 from "figma:asset/aa9cea39f3d310d1d5f2b9c4bee24e5e8db153e7.png";

export default function Frame() {
  return (
    <div className="relative size-full">
      <div className="absolute h-[1511px] left-0 top-0 w-[1654px]" data-name="palette_1">
        <img alt="" className="absolute inset-0 max-w-none object-50%-50% object-cover pointer-events-none size-full" src={imgPalette1} />
      </div>
      <div className="absolute h-[1511px] left-[1694px] top-0 w-[1654px]" data-name="palette_2">
        <img alt="" className="absolute inset-0 max-w-none object-50%-50% object-cover pointer-events-none size-full" src={imgPalette2} />
      </div>
    </div>
  );
}