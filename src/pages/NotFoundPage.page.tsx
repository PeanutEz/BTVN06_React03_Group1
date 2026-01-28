const NotFoundPage = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-800">
      <div className="rounded-2xl border border-slate-200 bg-white px-10 py-12 text-center shadow-sm">
        <p className="text-7xl font-bold text-blue-600">404</p>
        <p className="mt-4 text-xl font-semibold">Không tìm thấy trang</p>
        <p className="mt-2 text-sm text-slate-500">Đường dẫn không tồn tại hoặc đã bị di chuyển.</p>
      </div>
    </div>
  );
};

export default NotFoundPage;
