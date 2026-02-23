import { useQuery } from "@tanstack/react-query";
import { Card, Form, Input, Button, Spin, Row, Col } from "antd";
import { getContactPage } from "../../services/mockApi";
import {
  MailOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";

const { TextArea } = Input;

const ContactPage = () => {
  const { data: page, isLoading } = useQuery({
    queryKey: ["contact-page"],
    queryFn: getContactPage,
  });

  const [form] = Form.useForm();

  const onFinish = (values: any) => {
    console.log("Form values:", values);
    // No submit logic as per requirements
  };

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
    <div className="p-6 space-y-6">
      <Card className="shadow-sm">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          {page.title}
        </h1>
        <div
          className="prose max-w-none mb-8"
          dangerouslySetInnerHTML={{ __html: page.content }}
        />
      </Card>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={12}>
          <Card title="Thông tin liên hệ" className="shadow-sm">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <EnvironmentOutlined className="text-2xl text-amber-600 mt-1" />
                <div>
                  <p className="font-semibold text-gray-900">Địa chỉ</p>
                  <p className="text-gray-600">
                    123 Đường ABC, Quận XYZ, TP. Hồ Chí Minh
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <PhoneOutlined className="text-2xl text-amber-600 mt-1" />
                <div>
                  <p className="font-semibold text-gray-900">Điện thoại</p>
                  <p className="text-gray-600">1900 1234</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MailOutlined className="text-2xl text-amber-600 mt-1" />
                <div>
                  <p className="font-semibold text-gray-900">Email</p>
                  <p className="text-gray-600">contact@coffee.com</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <ClockCircleOutlined className="text-2xl text-amber-600 mt-1" />
                <div>
                  <p className="font-semibold text-gray-900">Giờ làm việc</p>
                  <p className="text-gray-600">7:00 - 22:00 hàng ngày</p>
                </div>
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="Gửi tin nhắn" className="shadow-sm">
            <Form form={form} layout="vertical" onFinish={onFinish}>
              <Form.Item
                name="name"
                label="Họ và tên"
                rules={[
                  { required: true, message: "Vui lòng nhập họ và tên" },
                ]}
              >
                <Input placeholder="Nhập họ và tên" />
              </Form.Item>

              <Form.Item
                name="email"
                label="Email"
                rules={[
                  { required: true, message: "Vui lòng nhập email" },
                  { type: "email", message: "Email không hợp lệ" },
                ]}
              >
                <Input placeholder="Nhập email" />
              </Form.Item>

              <Form.Item
                name="phone"
                label="Số điện thoại"
                rules={[
                  { required: true, message: "Vui lòng nhập số điện thoại" },
                ]}
              >
                <Input placeholder="Nhập số điện thoại" />
              </Form.Item>

              <Form.Item
                name="message"
                label="Tin nhắn"
                rules={[
                  { required: true, message: "Vui lòng nhập tin nhắn" },
                ]}
              >
                <TextArea
                  rows={5}
                  placeholder="Nhập tin nhắn của bạn"
                />
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  block
                  size="large"
                >
                  Gửi tin nhắn
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default ContactPage;