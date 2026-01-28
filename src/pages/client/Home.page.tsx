const HomePage = () => {
	return (
		<section className="grid gap-12 lg:grid-cols-2 lg:items-center">
			<div className="space-y-6">
				<div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700">
					<span className="size-2 rounded-full bg-blue-500" />
					Xin chào, đây là demo Login → Home → Admin
				</div>
				<h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
					Nền tảng quản lý người dùng đơn giản
				</h1>
				<p className="text-lg leading-relaxed text-slate-600">
					Đăng nhập để trải nghiệm luồng người dùng, phân quyền và trang quản trị. Dữ liệu đang dùng mock API có sẵn.
				</p>
				<div className="flex flex-wrap gap-3 text-sm text-slate-600">
					<div className="flex items-center gap-2 rounded-full bg-white px-3 py-2 shadow-sm">
						<span className="size-2 rounded-full bg-emerald-500" />
						Client Login
					</div>
					<div className="flex items-center gap-2 rounded-full bg-white px-3 py-2 shadow-sm">
						<span className="size-2 rounded-full bg-indigo-500" />
						Admin Login
					</div>
					<div className="flex items-center gap-2 rounded-full bg-white px-3 py-2 shadow-sm">
						<span className="size-2 rounded-full bg-amber-500" />
						User Management
					</div>
				</div>
			</div>
			<div className="relative">
				<div className="absolute inset-0 -z-10 animate-pulse rounded-3xl bg-gradient-to-tr from-blue-100 via-white to-indigo-100 blur-2xl" />
				<div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-blue-100/60">
					<div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
						<p className="text-sm font-semibold text-slate-800">Tóm tắt tính năng</p>
						<p className="text-xs text-slate-500">Login / Redirect / Admin / User table</p>
					</div>
					<div className="space-y-4 px-6 py-5 text-sm text-slate-700">
						<div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3">
							<span className="size-8 rounded-full bg-blue-100 text-blue-700" />
							<div>
								<p className="font-semibold">Đăng nhập</p>
								<p className="text-xs text-slate-500">Kiểm tra email/password từ mock API user</p>
							</div>
						</div>
						<div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3">
							<span className="size-8 rounded-full bg-emerald-100 text-emerald-700" />
							<div>
								<p className="font-semibold">Phân quyền</p>
								<p className="text-xs text-slate-500">Admin mới vào được trang quản trị</p>
							</div>
						</div>
						<div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3">
							<span className="size-8 rounded-full bg-amber-100 text-amber-700" />
							<div>
								<p className="font-semibold">Quản lý User</p>
								<p className="text-xs text-slate-500">Xem danh sách, xóa tài khoản nhanh</p>
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
};

export default HomePage;
