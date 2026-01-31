import type { Voucher } from "../types/product.type";

interface VoucherCardProps {
    voucher: Voucher;
}

export default function VoucherCard({ voucher }: VoucherCardProps) {
    const formatMoney = (amount: number) => {
        return new Intl.NumberFormat("vi-VN", {
            style: "currency",
            currency: "VND",
        }).format(amount);
    };

    return (
        <div className="bg-white rounded-xl shadow-md p-4 relative overflow-hidden border-l-4 border-amber-500 hover:shadow-lg transition-shadow">
            {/* Background decoration */}
            <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-amber-100 rounded-full opacity-50" />

            <div className="relative z-10">
                <div className="flex justify-between items-start mb-2">
                    <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-1 rounded">
                        {voucher.code}
                    </span>
                    <span className="text-xs text-gray-500">
                        HSD: {new Date(voucher.expiryDate).toLocaleDateString("vi-VN")}
                    </span>
                </div>

                <h3 className="font-bold text-gray-900 mb-1">
                    {voucher.discountType === "FIXED"
                        ? `Giảm ${formatMoney(voucher.discountAmount)}`
                        : `Giảm ${voucher.discountAmount}%`
                    }
                </h3>

                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {voucher.description}
                </p>

                <button
                    onClick={() => {
                        navigator.clipboard.writeText(voucher.code);
                        alert(`Đã sao chép mã ${voucher.code}`);
                    }}
                    className="w-full bg-amber-50 text-amber-600 text-sm font-medium py-2 rounded-lg hover:bg-amber-100 transition-colors border border-amber-200 border-dashed"
                >
                    Sao chép mã
                </button>
            </div>

            {/* Circle cutouts for ticket look */}
            <div className="absolute top-1/2 -left-2 w-4 h-4 bg-[#f8f1ea] rounded-full" />
            <div className="absolute top-1/2 -right-2 w-4 h-4 bg-[#f8f1ea] rounded-full" />
        </div>
    );
}
