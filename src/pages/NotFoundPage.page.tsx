const NotFoundPage = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0f0a08] px-4 text-primary-50">
      <div className="rounded-2xl border border-primary-800/40 bg-[#1b100c]/90 px-10 py-12 text-center shadow-xl shadow-black/40">
        <p className="text-7xl font-bold text-primary-400">404</p>
        <p className="mt-4 text-xl font-semibold">Không tìm thấy trang</p>
        <p className="mt-2 text-sm text-primary-100/70">Đường dẫn không tồn tại hoặc đã bị di chuyển.</p>
      </div>
    </div>
  );
};

export default NotFoundPage;
