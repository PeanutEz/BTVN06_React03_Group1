import { useState } from "react";
import { useAuthStore } from "../../../store/auth.store";
import { updateUserProfile } from "../../../services/user.service";
import { showSuccess, showError } from "../../../utils/toast.util";
import type { User } from "../../../models";

export default function ProfilePage() {
	const { user, login } = useAuthStore();
	const [isEditing, setIsEditing] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [formData, setFormData] = useState<Partial<User>>(
		user || {
			name: "",
			email: "",
			avatar: "",
		}
	);

	const handleInputChange = (
		e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
	) => {
		const { name, value } = e.target;
		setFormData({
			...formData,
			[name]: value,
		});
	};

	const handleSaveProfile = async () => {
		if (!user?.id) return;

		if (!formData.name?.trim()) {
			showError("Vui lòng nhập tên");
			return;
		}

		if (!formData.email?.trim()) {
			showError("Vui lòng nhập email");
			return;
		}

		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(formData.email)) {
			showError("Email không hợp lệ");
			return;
		}

		try {
			setIsLoading(true);
			const updatedUser = await updateUserProfile(user.id, {
				name: formData.name,
				email: formData.email,
				avatar: formData.avatar || user.avatar,
			});

			login(updatedUser);
			setIsEditing(false);
			showSuccess("Cập nhật hồ sơ thành công");
		} catch (error) {
			showError("Cập nhật hồ sơ thất bại");
			console.error(error);
		} finally {
			setIsLoading(false);
		}
	};

	const handleCancel = () => {
		setFormData(
			user || {
				name: "",
				email: "",
				avatar: "",
			}
		);
		setIsEditing(false);
	};

	if (!user) {
		return (
			<div className="flex items-center justify-center min-h-screen bg-gray-50">
				<div className="text-center">
					<h1 className="text-2xl font-bold text-gray-900 mb-4">
						Vui lòng đăng nhập
					</h1>
					<p className="text-gray-600">
						Bạn cần đăng nhập để xem hồ sơ của mình
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
			<div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-8">
				{/* Header */}
				<div className="flex items-center justify-between mb-8">
					<h1 className="text-3xl font-bold text-gray-900">Hồ sơ của tôi</h1>
					{!isEditing && (
						<button
							onClick={() => setIsEditing(true)}
							className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium"
						>
							Chỉnh sửa
						</button>
					)}
				</div>

				{/* Avatar Section */}
				<div className="flex flex-col items-center mb-8 pb-8 border-b border-gray-200">
					<img
						src={formData.avatar || user.avatar || "https://via.placeholder.com/120"}
						alt={formData.name || user.name}
						className="w-32 h-32 rounded-full object-cover mb-4 border-4 border-blue-100"
					/>
					<h2 className="text-2xl font-semibold text-gray-900">
						{formData.name || user.name}
					</h2>
					<p className="text-gray-600 mt-1">
						{user.role === "admin" ? "Quản trị viên" : "Người dùng"}
					</p>
				</div>

				{/* Profile Information */}
				<div className="space-y-6">
					{/* Name Field */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Tên
						</label>
						<input
							type="text"
							name="name"
							value={formData.name || ""}
							onChange={handleInputChange}
							disabled={!isEditing}
							className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors ${
								isEditing
									? "bg-white cursor-text"
									: "bg-gray-50 cursor-not-allowed text-gray-600"
							}`}
							placeholder="Nhập tên của bạn"
						/>
					</div>

					{/* Email Field */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Email
						</label>
						<input
							type="email"
							name="email"
							value={formData.email || ""}
							onChange={handleInputChange}
							disabled={!isEditing}
							className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors ${
								isEditing
									? "bg-white cursor-text"
									: "bg-gray-50 cursor-not-allowed text-gray-600"
							}`}
							placeholder="Nhập email của bạn"
						/>
					</div>

					{/* Avatar URL Field */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							URL Avatar
						</label>
						<input
							type="text"
							name="avatar"
							value={formData.avatar || ""}
							onChange={handleInputChange}
							disabled={!isEditing}
							className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors ${
								isEditing
									? "bg-white cursor-text"
									: "bg-gray-50 cursor-not-allowed text-gray-600"
							}`}
							placeholder="Nhập URL avatar"
						/>
					</div>

					{/* User ID Field */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							ID người dùng
						</label>
						<input
							type="text"
							value={user.id}
							disabled
							className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed text-gray-600"
						/>
					</div>

					{/* Created Date Field */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Ngày tạo
						</label>
						<input
							type="text"
							value={
								user.createDate
									? new Date(user.createDate).toLocaleDateString("vi-VN")
									: "N/A"
							}
							disabled
							className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed text-gray-600"
						/>
					</div>

					{/* Role Field */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Quyền
						</label>
						<div className="flex items-center px-4 py-2 border border-gray-300 rounded-lg bg-gray-50">
							<span className="text-gray-600 capitalize">{user.role}</span>
							<span
								className={`ml-auto px-3 py-1 rounded-full text-sm font-medium ${
									user.role === "admin"
										? "bg-red-100 text-red-800"
										: "bg-green-100 text-green-800"
								}`}
							>
								{user.role === "admin" ? "Quản trị viên" : "Người dùng"}
							</span>
						</div>
					</div>
				</div>

				{/* Action Buttons */}
				{isEditing && (
					<div className="flex gap-4 mt-8 pt-8 border-t border-gray-200">
						<button
							onClick={handleSaveProfile}
							disabled={isLoading}
							className="flex-1 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{isLoading ? "Đang lưu..." : "Lưu thay đổi"}
						</button>
						<button
							onClick={handleCancel}
							disabled={isLoading}
							className="flex-1 px-6 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition-colors duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
						>
							Hủy
						</button>
					</div>
				)}

				{/* Info Message */}
				<div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
					<p className="text-sm text-blue-800">
						<strong>Lưu ý:</strong> Bạn có thể cập nhật tên, email và avatar của mình.
						ID người dùng, ngày tạo và quyền không thể chỉnh sửa.
					</p>
				</div>
			</div>
		</div>
	);
}
