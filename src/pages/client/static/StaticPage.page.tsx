// KAN-93: Page phụ (static content page)
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { Card, Spin } from "antd";
import { getStaticPage } from "../../../services/mockApi";

export default function StaticPage() {
  const { slug } = useParams<{ slug: string }>();

  const { data: page, isLoading } = useQuery({
    queryKey: ["static-page", slug],
    queryFn: () => getStaticPage(slug || ""),
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <div className="p-6 flex justify-center items-center min-h-[400px]">
        <Spin size="large" />
      </div>
    );
  }

  if (!page) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-gray-500">Không tìm thấy trang</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Card className="shadow-sm">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">{page.title}</h1>
        <div
          className="prose max-w-none"
          dangerouslySetInnerHTML={{ __html: page.content }}
        />
      </Card>
    </div>
  );
}
