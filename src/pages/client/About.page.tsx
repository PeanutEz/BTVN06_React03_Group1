// KAN-94: About
import { useQuery } from "@tanstack/react-query";
import { Card, Spin } from "antd";
import { getAboutPage } from "../../services/mockApi";

const AboutPage = () => {
  const { data: page, isLoading } = useQuery({
    queryKey: ["about-page"],
    queryFn: getAboutPage,
  });

  if (isLoading) {
    return (
      <div className="p-6 flex justify-center items-center min-h-[400px]">
        <Spin size="large" />
      </div>
    );
  }

  if (!page) {
    return <div className="p-6">Không tìm thấy nội dung</div>;
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
};

export default AboutPage;
