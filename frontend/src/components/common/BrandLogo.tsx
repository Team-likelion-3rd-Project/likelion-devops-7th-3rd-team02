import logoMark from '../../assets/logo-mark.svg'

function BrandLogo({ className = '' }: { className?: string }) {
  return (
    <div
      className={`flex items-center gap-2.5 text-[17px] font-bold tracking-[-0.01em] ${className}`}
    >
      <img src={logoMark} alt="" className="h-7 w-7" />
      DevFlow
    </div>
  )
}

export default BrandLogo
