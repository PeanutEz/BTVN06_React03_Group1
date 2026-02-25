export default function CustomerFavoritesPage() {
  return (
    <div>
      <h2 className="text-xl font-bold text-green-700 mb-6">Sản phẩm yêu thích</h2>
      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 py-20">
        <span className="text-5xl mb-4">❤️</span>
        <p className="text-gray-500 font-medium">Chưa có sản phẩm yêu thích</p>
        <p className="mt-1 text-sm text-gray-400">Thêm sản phẩm yêu thích để xem lại dễ dàng hơn</p>
      </div>
    </div>
  );
}
