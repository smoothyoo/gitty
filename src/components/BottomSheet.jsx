const BottomSheet = ({ isOpen, onClose, title, maxHeight = false, children }) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end" onClick={onClose}>
      <div
        className={`bg-zinc-950 w-full rounded-t-3xl pt-4 pb-6 px-6 ${maxHeight ? 'max-h-[80vh] overflow-y-auto' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-zinc-700 rounded-full mx-auto mb-5" />
        {title && (
          <h3 className="text-lg font-bold text-white mb-4">{title}</h3>
        )}
        {children}
      </div>
    </div>
  )
}

export default BottomSheet
