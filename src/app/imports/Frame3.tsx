import imgAd1 from "figma:asset/b9f87d58e0ae9a3884c12793e1ea7562fd1d3742.png";
import imgEnergy1 from "figma:asset/8515896910322bc62854d803695158c24ee34aa7.png";

export default function Frame() {
  return (
    <div className="relative size-full">
      <div className="absolute left-0 size-[3000px] top-[144px]" data-name="ad 1">
        <img alt="" className="absolute inset-0 max-w-none object-50%-50% object-cover pointer-events-none size-full" src={imgAd1} />
      </div>
      <div className="absolute left-[2909px] size-[3000px] top-0" data-name="energy 1">
        <img alt="" className="absolute inset-0 max-w-none object-50%-50% object-cover pointer-events-none size-full" src={imgEnergy1} />
      </div>
    </div>
  );
}
