const NotFoundPage = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4 text-white">
      <div className="rounded-2xl border border-primary-500/30 bg-slate-900/90 backdrop-blur-xl px-10 py-12 text-center shadow-2xl shadow-primary-500/20 animate-fade-in">
        <p className="text-7xl font-bold text-primary-500 animate-glow">404</p>
        <p className="mt-4 text-xl font-semibold">Không tìm thấy trang</p>
        <p className="mt-2 text-sm text-slate-400">Đường dẫn không tồn tại hoặc đã bị di chuyển.</p>
      </div>
    </div>
  );
};

export default NotFoundPage;
