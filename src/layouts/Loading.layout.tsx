const LoadingLayout = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-700">
      <div className="flex items-center gap-3 text-sm font-medium">
        <span className="size-3 animate-ping rounded-full bg-blue-500" />
        <span>Đang tải...</span>
      </div>
    </div>
  );
};

export default LoadingLayout;
