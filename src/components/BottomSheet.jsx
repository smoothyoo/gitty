const BottomSheet = ({ isOpen, onClose, title, maxHeight = false, children }) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end" onClick={onClose}>
      <div
        className={`bg-white w-full rounded-t-3xl p-6 ${maxHeight ? 'max-h-[80vh] overflow-y-auto' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <h3 className="text-lg font-bold text-surface-900 mb-4">{title}</h3>
        )}
        {children}
      </div>
    </div>
  )
}

export default BottomSheet
