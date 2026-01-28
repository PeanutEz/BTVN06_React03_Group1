const LoadingLayout = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0f0a08] text-primary-50">
      <div className="flex items-center gap-3 text-sm font-medium">
        <span className="size-3 animate-ping rounded-full bg-primary-400" />
        <span>Đang tải...</span>
      </div>
    </div>
  );
};

export default LoadingLayout;
