interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  itemsPerPage?: number;
  variant?: "light" | "dark" | "dark-red";
}

const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage,
  variant = "light",
}: PaginationProps) => {
  if (totalPages <= 1) return null;

  const isDark = variant === "dark" || variant === "dark-red";
  const isRed = variant === "dark-red";

  // Sliding window: show max 3 page numbers centered on current page
  const getPageNumbers = () => {
    const pages: number[] = [];
    let start = Math.max(1, currentPage - 1);
    let end = start + 2;
    if (end > totalPages) {
      end = totalPages;
      start = Math.max(1, end - 2);
    }
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  const from = totalItems && itemsPerPage ? (currentPage - 1) * itemsPerPage + 1 : undefined;
  const to =
    totalItems && itemsPerPage
      ? Math.min(currentPage * itemsPerPage, totalItems)
      : undefined;
  return (
    <div className="flex flex-col items-center gap-2 py-4 sm:flex-row sm:justify-between">
      {totalItems !== undefined && from !== undefined && to !== undefined ? (
        <p className={`text-sm ${isDark ? "text-white/40" : "text-slate-500"}`}>
          Hiển thị{" "}
          <span className={`font-semibold ${isDark ? (isRed ? "text-red-300" : "text-white/70") : "text-slate-700"}`}>{from}</span> –{" "}
          <span className={`font-semibold ${isDark ? (isRed ? "text-red-300" : "text-white/70") : "text-slate-700"}`}>{to}</span> trong{" "}
          <span className={`font-semibold ${isDark ? (isRed ? "text-red-300" : "text-white/70") : "text-slate-700"}`}>{totalItems}</span> kết quả
        </p>
      ) : (
        <div />
      )}

      <div className="flex items-center gap-1">
        {/* Previous */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={`flex items-center gap-1 rounded-lg border px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
            isRed
              ? "border-red-500/30 bg-red-500/10 text-red-300/70 hover:bg-red-500/20 hover:text-red-200"
              : isDark
              ? "border-white/15 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
              : "border-slate-200 bg-white text-slate-600 hover:border-primary-400 hover:bg-primary-50 hover:text-primary-700"
          }`}
        >
          <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Trước
        </button>

        {/* Pages */}
        {getPageNumbers().map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`min-w-[38px] rounded-lg border px-3 py-2 text-sm font-medium transition ${
              currentPage === page
                ? isRed
                  ? "border-red-500 bg-gradient-to-b from-red-500 to-red-600 text-white shadow-sm shadow-red-500/40"
                  : isDark
                  ? "border-primary-500/60 bg-primary-500/20 text-primary-400 shadow-sm"
                  : "border-primary-500 bg-gradient-to-b from-primary-500 to-primary-600 text-white shadow-sm shadow-primary-500/40"
                : isRed
                  ? "border-red-500/20 bg-red-500/5 text-red-300/60 hover:bg-red-500/15 hover:text-red-200"
                  : isDark
                  ? "border-white/10 bg-white/5 text-white/50 hover:bg-white/10 hover:text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-primary-400 hover:bg-primary-50 hover:text-primary-700"
            }`}
          >
            {page}
          </button>
        ))}

        {/* Next */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={`flex items-center gap-1 rounded-lg border px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
            isRed
              ? "border-red-500/30 bg-red-500/10 text-red-300/70 hover:bg-red-500/20 hover:text-red-200"
              : isDark
              ? "border-white/15 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
              : "border-slate-200 bg-white text-slate-600 hover:border-primary-400 hover:bg-primary-50 hover:text-primary-700"
          }`}
        >
          Sau
          <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default Pagination;
