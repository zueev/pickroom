import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: false },

  // 화면 파일은 캐시하지 않는다. 사파리가 옛 화면을 붙들고 있어서
  // 주소 뒤에 ?v=1 을 붙여야 새 화면이 나오던 문제를 없앤다.
  // /_next/static 아래 파일은 이름에 해시가 붙으므로 그대로 캐시한다.
  async headers() {
    return [
      {
        source: "/((?!_next/static|_next/image).*)",
        headers: [
          { key: "Cache-Control", value: "no-store, max-age=0, must-revalidate" },
          { key: "CDN-Cache-Control", value: "no-store" },
        ],
      },
    ];
  },
};

export default nextConfig;
