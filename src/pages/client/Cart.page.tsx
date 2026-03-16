export default function CartPage() {
  return (
    <div>
      <h2 className="text-xl font-bold text-green-700 mb-6">Giỏ hàng</h2>
      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 py-20">
        <span className="text-5xl mb-4">🛒</span>
        <p className="text-gray-500 font-medium">Giỏ hàng trống</p>
        <p className="mt-1 text-sm text-gray-400">Thêm sản phẩm vào giỏ hàng để tiến hành thanh toán</p>
      </div>
    </div>
  );
}
