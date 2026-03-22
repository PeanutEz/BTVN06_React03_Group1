import { useQuery } from "@tanstack/react-query";
import { getContactPage } from "../../services/mockApi";
import { useState } from "react";

const ContactPage = () => {
  const { data: page, isLoading } = useQuery({
    queryKey: ["contact-page"],
    queryFn: getContactPage,
  });

  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Vui lòng nhập họ và tên";
    if (!form.email.trim()) e.email = "Vui lòng nhập email";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Email không hợp lệ";
    if (!form.phone.trim()) e.phone = "Vui lòng nhập số điện thoại";
    if (!form.message.trim()) e.message = "Vui lòng nhập tin nhắn";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      console.log("Form values:", form);
    }
  };

  const updateField = (field: string, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: "" }));
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-amber-200 border-t-amber-500 rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <p className="text-gray-500">Không tìm thấy nội dung</p>
      </div>
    );
  }

  const contactItems = [
    {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
        </svg>
      ),
      label: "Địa chỉ",
      value: "123 Đường ABC, Quận XYZ, TP. Hồ Chí Minh",
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
        </svg>
      ),
      label: "Điện thoại",
      value: "1900 1234",
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
        </svg>
      ),
      label: "Email",
      value: "contact@coffee.com",
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      label: "Giờ làm việc",
      value: "7:00 - 22:00 hàng ngày",
    },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-5">
      {/* Hero */}
      <div className="bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 rounded-2xl p-5 border border-amber-100">
        <h1 className="text-xl font-bold text-gray-900 mb-1.5">{page.title}</h1>
        <div
          className="prose prose-sm max-w-none text-gray-600 text-sm [&>p]:mb-1.5 [&>h2]:text-base [&>h2]:font-semibold [&>h2]:text-gray-800 [&>h2]:mt-2"
          dangerouslySetInnerHTML={{ __html: page.content }}
        />
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Contact Info */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <h2 className="font-bold text-gray-900 text-sm">Thông tin liên hệ</h2>
          </div>
          <div className="px-5 py-4 space-y-3">
            {contactItems.map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0 text-amber-600">
                  {item.icon}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{item.label}</p>
                  <p className="text-gray-500 text-sm mt-0.5">{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Contact Form */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <h2 className="font-bold text-gray-900 text-sm">Gửi tin nhắn</h2>
          </div>
          <form onSubmit={onSubmit} className="px-5 py-4 space-y-3">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                placeholder="Nhập họ và tên"
                className={`w-full px-3.5 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-transparent transition-all ${errors.name ? "border-red-300 bg-red-50" : "border-gray-200"}`}
              />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                placeholder="Nhập email"
                className={`w-full px-3 py-2 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-transparent transition-all ${errors.email ? "border-red-300 bg-red-50" : "border-gray-200"}`}
              />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                placeholder="Nhập số điện thoại"
                className={`w-full px-3 py-2 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-transparent transition-all ${errors.phone ? "border-red-300 bg-red-50" : "border-gray-200"}`}
              />
              {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tin nhắn</label>
              <textarea
                rows={3}
                value={form.message}
                onChange={(e) => updateField("message", e.target.value)}
                placeholder="Nhập tin nhắn của bạn"
                className={`w-full px-3 py-2 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-transparent transition-all resize-none ${errors.message ? "border-red-300 bg-red-50" : "border-gray-200"}`}
              />
              {errors.message && <p className="text-xs text-red-500 mt-1">{errors.message}</p>}
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white font-semibold text-sm rounded-xl transition-all shadow-sm shadow-amber-200"
            >
              Gửi tin nhắn
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;