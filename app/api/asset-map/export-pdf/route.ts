/**
 * POST /api/asset-map/export-pdf
 *
 * 자산 지도 캔버스를 PDF로 변환하여 다운로드한다.
 * - 클라이언트에서 타일로 분할한 이미지 배열을 받음
 * - 빈 타일은 클라이언트에서 이미 제외됨
 * - 첫 페이지: 전체 축소 미리보기
 * - 이후 페이지: 타일별 상세 (비어있지 않은 것만)
 */

/* eslint-disable jsx-a11y/alt-text */
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import React from "react";
import path from "path";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  renderToBuffer,
  Font,
} from "@react-pdf/renderer";

// ── 한글 폰트 등록 ──
const fontDir = path.join(process.cwd(), "public", "fonts");
Font.register({
  family: "NotoSansKR",
  fonts: [
    { src: path.join(fontDir, "NotoSansKR-Regular.ttf"), fontWeight: "normal" as const },
    { src: path.join(fontDir, "NotoSansKR-Bold.ttf"), fontWeight: "bold" as const },
  ],
});
Font.registerHyphenationCallback((word: string) => [word]);

// A3 Landscape (mm → pt: 1mm ≈ 2.8346pt)
const A3_W = 420 * 2.8346; // ≈ 1190pt
const A3_H = 297 * 2.8346; // ≈ 842pt
const MARGIN = 40;
const CONTENT_W = A3_W - MARGIN * 2;
const CONTENT_H = A3_H - MARGIN * 2;
const HEADER_H = 32;
const FOOTER_H = 20;
const IMG_AREA_H = CONTENT_H - HEADER_H - FOOTER_H;

interface TileData {
  image: string;   // base64 data URL
  col: number;
  row: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

const styles = StyleSheet.create({
  page: { fontFamily: "NotoSansKR", padding: MARGIN, backgroundColor: "#FFFFFF" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", height: HEADER_H, marginBottom: 4 },
  title: { fontSize: 14, fontWeight: "bold", color: "#111827" },
  subtitle: { fontSize: 9, color: "#6B7280" },
  overviewLabel: { fontSize: 9, color: "#6B7280", marginBottom: 4 },
  imgContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  footer: { position: "absolute", bottom: MARGIN, left: MARGIN, right: MARGIN, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  footerText: { fontSize: 7, color: "#9CA3AF" },
  regionInfo: { fontSize: 7, color: "#9CA3AF" },
});

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  try {
    const body = await request.json();
    const { overview, tiles, title, totalCols, totalRows } = body as {
      overview: string;         // 전체 축소 이미지 (base64)
      tiles: TileData[];        // 비어있지 않은 타일들
      title?: string;
      totalCols: number;
      totalRows: number;
    };

    if (!overview || !tiles || tiles.length === 0) {
      return NextResponse.json({ error: "overview, tiles 필수" }, { status: 400 });
    }

    const today = new Date().toISOString().slice(0, 10);
    const pdfTitle = title || "자산 지도";
    const totalPages = tiles.length + 1; // overview + detail tiles

    const pages: React.ReactElement[] = [];

    // ── 페이지 1: 전체 미리보기 ──
    pages.push(
      React.createElement(
        Page,
        { key: "overview", size: [A3_W, A3_H], style: styles.page },
        // Header
        React.createElement(
          View,
          { style: styles.header },
          React.createElement(Text, { style: styles.title }, pdfTitle),
          React.createElement(Text, { style: styles.subtitle }, today),
        ),
        React.createElement(Text, { style: styles.overviewLabel },
          `전체 보기 (${totalCols}×${totalRows} 그리드, 상세 ${tiles.length}페이지)`),
        // Overview image — fill available space
        React.createElement(
          View,
          { style: styles.imgContainer },
          React.createElement(Image, {
            src: overview,
            style: { maxWidth: CONTENT_W, maxHeight: IMG_AREA_H, objectFit: "contain" as const },
          }),
        ),
        // Footer
        React.createElement(
          View,
          { style: styles.footer },
          React.createElement(Text, { style: styles.footerText }, "Asset Manager"),
          React.createElement(Text, { style: styles.footerText }, `1 / ${totalPages}`),
        ),
      ),
    );

    // ── 이후 페이지: 타일별 상세 ──
    tiles.forEach((tile, idx) => {
      const pageNum = idx + 2;
      const gridLabel = `[${tile.row + 1},${tile.col + 1}]`;

      pages.push(
        React.createElement(
          Page,
          { key: `tile-${idx}`, size: [A3_W, A3_H], style: styles.page },
          // Header
          React.createElement(
            View,
            { style: styles.header },
            React.createElement(Text, { style: styles.title },
              `${pdfTitle} — ${idx + 1}/${tiles.length}`),
            React.createElement(Text, { style: styles.subtitle },
              `영역 ${gridLabel}`),
          ),
          // Tile image — fill the page
          React.createElement(
            View,
            { style: styles.imgContainer },
            React.createElement(Image, {
              src: tile.image,
              style: { maxWidth: CONTENT_W, maxHeight: IMG_AREA_H, objectFit: "contain" as const },
            }),
          ),
          // Footer
          React.createElement(
            View,
            { style: styles.footer },
            React.createElement(Text, { style: styles.footerText }, "Asset Manager"),
            React.createElement(Text, { style: styles.footerText }, `${pageNum} / ${totalPages}`),
          ),
        ),
      );
    });

    const doc = React.createElement(Document, { title: pdfTitle }, ...pages);
    const buffer = await renderToBuffer(doc);

    const filename = `AssetMap_${today}.pdf`;
    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Asset map PDF export failed:", error);
    return NextResponse.json(
      { error: "PDF 생성에 실패했습니다." },
      { status: 500 },
    );
  }
}
