"use client";

import { useState } from "react";
import Papa from "papaparse";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";

// Konversi Kurs USD ke IDR (Ubah ke 1 jika data di CSV sudah nominal Rupiah)
const KURS_USD_TO_IDR = 15000;

export default function Home() {
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [avgIncome, setAvgIncome] = useState(0);
  const [campaignSuccess, setCampaignSuccess] = useState(0);
  const [totalCampaigns, setTotalCampaigns] = useState(0);

  // State untuk Dataset Summary
  const [datasetMeta, setDatasetMeta] = useState<{
    fileName: string;
    rows: number;
    cols: number;
    isLoaded: boolean;
  }>({
    fileName: "",
    rows: 0,
    cols: 0,
    isLoaded: false,
  });

  // State Grafik Visual (Recharts)
  const [educationChartData, setEducationChartData] = useState<any[]>([]);
  const [campaignChartData, setCampaignChartData] = useState<any[]>([]);

  // State Tabel Pratinjau Data
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [previewCols, setPreviewCols] = useState<string[]>([]);

  // State untuk AI Insight
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiInsight, setAiInsight] = useState<{
    summary: string;
    highlights: string[];
    recommendations: string[];
  } | null>(null);

  const handleCSVUpload = (event: any) => {
    const file = event.target.files[0];
    if (!file) return;

    // Reset AI insight saat upload file baru
    setAiInsight(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data: any = results.data;
        const fields = results.meta.fields || [];

        // Hapus baris kosong berdasarkan ID atau Income
        const cleanData = data.filter((row: any) => row.ID || row.Income);
        if (cleanData.length === 0) return;

        // 1. Update Metadata Dataset
        setDatasetMeta({
          fileName: file.name,
          rows: cleanData.length,
          cols: fields.length,
          isLoaded: true,
        });

        // 2. Metrik KPI Utama
        setTotalCustomers(cleanData.length);

        const totalIncome = cleanData.reduce((sum: number, row: any) => {
          return sum + Number(row.Income || 0);
        }, 0);
        const averageUSD = Math.round(totalIncome / cleanData.length);
        const averageIDR = averageUSD * KURS_USD_TO_IDR;
        setAvgIncome(averageIDR);

        const accepted = cleanData.filter(
          (row: any) => String(row.Response) === "1"
        ).length;
        const successRate = Math.round((accepted / cleanData.length) * 100);
        setCampaignSuccess(successRate);

        const campaignCols = fields.filter(
          (f: string) =>
            f.toLowerCase().includes("cmp") || f.toLowerCase().includes("response")
        );
        setTotalCampaigns(campaignCols.length > 0 ? campaignCols.length : 6);

        // 3. Olah Data Grafik 1: Distribusi Pendapatan Rata-Rata per Tingkat Pendidikan
        const eduMap: { [key: string]: { total: number; count: number } } = {};
        cleanData.forEach((row: any) => {
          const edu = row.Education || "Unspecified";
          const inc = Number(row.Income || 0) * KURS_USD_TO_IDR;
          if (!eduMap[edu]) eduMap[edu] = { total: 0, count: 0 };
          if (inc > 0) {
            eduMap[edu].total += inc;
            eduMap[edu].count += 1;
          }
        });

        const eduFormatted = Object.keys(eduMap).map((edu) => ({
          education: edu,
          avgIncome: eduMap[edu].count > 0 ? Math.round(eduMap[edu].total / eduMap[edu].count) : 0,
        }));
        setEducationChartData(eduFormatted);

        // 4. Olah Data Grafik 2: Performa Konversi Per Kampanye (Cmp1 hingga Cmp6)
        const campaignKeys = [
          { key: "AcceptedCmp1", label: "Cmp 1" },
          { key: "AcceptedCmp2", label: "Cmp 2" },
          { key: "AcceptedCmp3", label: "Cmp 3" },
          { key: "AcceptedCmp4", label: "Cmp 4" },
          { key: "AcceptedCmp5", label: "Cmp 5" },
          { key: "Response", label: "Cmp 6 (Latest)" },
        ];

        const cmpFormatted = campaignKeys.map((cmp) => {
          const count = cleanData.filter((r: any) => String(r[cmp.key]) === "1").length;
          return {
            name: cmp.label,
            conversions: count,
            rate: Math.round((count / cleanData.length) * 100),
          };
        });
        setCampaignChartData(cmpFormatted);

        // 5. Set Data Pratinjau Tabel (8 Kolom dan 8 Baris Pertama)
        setPreviewCols(fields.slice(0, 8));
        setPreviewRows(cleanData.slice(0, 8));
      },
    });
  };

  // FUNGSI UNTUK GENERATE AI INSIGHT
  const handleGenerateInsight = () => {
    setIsGenerating(true);

    // Simulasi pemrosesan AI selama 1.2 detik
    setTimeout(() => {
      setAiInsight({
        summary: `Berdasarkan analisis terhadap ${totalCustomers.toLocaleString("id-ID")} pelanggan, performa kampanye saat ini berada di angka konversi ${campaignSuccess}%. Profil pendapatan rata-rata pelanggan tergolong ${
          avgIncome > 500000000 ? "Tinggi (Premium)" : "Menengah"
        } di Rp${avgIncome.toLocaleString("id-ID")}/tahun (~Rp${Math.round(
          avgIncome / 12
        ).toLocaleString("id-ID")}/bulan).`,
        highlights: [
          `Tingkat Konversi Pelanggan: ${campaignSuccess}% (${Math.round(
            (totalCustomers * campaignSuccess) / 100
          ).toLocaleString("id-ID")} orang merespon positif).`,
          `Potensi Pasar: Rata-rata daya beli pelanggan bernilai Rp${avgIncome.toLocaleString("id-ID")}/tahun.`,
          `Efisiensi Saluran: Terdeteksi ${totalCampaigns} saluran kampanye aktif yang berpotensi dioptimalkan.`,
        ],
        recommendations: [
          "Fokuskan budget promosi pada segmen pelanggan berpenerimaan di atas rata-rata.",
          "Personalisasi penawaran produk premium untuk meningkatkan rasio konversi hingga 25%.",
          "Hentikan pengeluaran iklan pada saluran kampanye dengan rasio penolakan terbanyak.",
        ],
      });
      setIsGenerating(false);
    }, 1200);
  };

  // FUNGSI UNTUK EXPORT AI SUMMARY KE PDF (DIPERBAIKI)
  const handleExportPDF = async () => {
    const element = document.getElementById("ai-summary-card");
    if (!element) return;

    try {
      // Dynamic import agar aman di Next.js Client Side Rendering
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const imgWidth = 190;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 10, 15, imgWidth, imgHeight);
      pdf.save(`MarketMind_AI_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (error) {
      console.error("Gagal mendownload PDF:", error);
      alert("Terjadi kesalahan teknis saat mengunduh PDF.");
    }
  };

  const chartColors = ["#4f46e5", "#06b6d4", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-500/20 selection:text-indigo-900">
      {/* 1. TOP NAVIGATION BAR */}
      <nav className="border-b border-slate-200/80 bg-white/90 backdrop-blur-md sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-violet-600 to-amber-500 p-[1px] flex items-center justify-center shadow-md shadow-indigo-500/10">
              <div className="w-full h-full bg-white rounded-[11px] flex items-center justify-center font-black text-indigo-600 text-base">
                M
              </div>
            </div>
            <span className="font-extrabold text-xl tracking-tight text-slate-900">
              MarketMind <span className="text-indigo-600">AI</span>
            </span>
            <span className="ml-2 text-[10px] font-bold tracking-widest uppercase bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full">
              Enterprise v1.0
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <span className="flex items-center gap-2 text-slate-600 font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              System Ready
            </span>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
        {/* 2. HERO HEADER SECTION */}
        <header className="space-y-4 max-w-3xl">
          <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
            Marketing Analytics <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-violet-600 to-amber-600">
              Powered by Intelligence
            </span>
          </h1>
          <p className="text-base font-medium text-slate-600 leading-relaxed">
            Unggah dataset bisnis Anda untuk membaca metrik performa kampanye, segmentasi pelanggan, dan rekomendasi otomatis dalam hitungan detik.
          </p>
        </header>

        {/* 3. KPI CARDS GRID */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden group hover:border-slate-300 hover:shadow-md transition-all">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-600">Total Customers</span>
              <span className="p-2 bg-indigo-50 rounded-xl text-base text-indigo-600 font-bold">👥</span>
            </div>
            <p className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              {totalCustomers > 0 ? totalCustomers.toLocaleString("id-ID") : "0"}
            </p>
            <p className="text-[11px] font-semibold text-slate-500 mt-2">Parsed from uploaded dataset</p>
          </div>

          {/* AVG INCOME CARD DENGAN ESTIMASI BULANAN */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden group hover:border-slate-300 hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-600">Avg Income</span>
                <span className="p-2 bg-emerald-50 rounded-xl text-base text-emerald-600 font-bold">💎</span>
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {avgIncome > 0 ? `Rp${avgIncome.toLocaleString("id-ID")}` : "Rp0"}
              </p>
            </div>
            
            <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
              <p className="text-[11px] font-semibold text-slate-500">Per year</p>
              <p className="text-[11px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                {avgIncome > 0 ? `~Rp${Math.round(avgIncome / 12).toLocaleString("id-ID")}/month` : "~Rp0/bln"}
              </p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden group hover:border-slate-300 hover:shadow-md transition-all">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-600">Campaign Success</span>
              <span className="p-2 bg-amber-50 rounded-xl text-base text-amber-600 font-bold">🎯</span>
            </div>
            <p className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              {campaignSuccess}%
            </p>
            <p className="text-[11px] font-semibold text-slate-500 mt-2">Overall conversion rate</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden group hover:border-slate-300 hover:shadow-md transition-all">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-600">Total Campaigns</span>
              <span className="p-2 bg-purple-50 rounded-xl text-base text-purple-600 font-bold">🚀</span>
            </div>
            <p className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              {totalCampaigns}
            </p>
            <p className="text-[11px] font-semibold text-slate-500 mt-2">Active marketing channels</p>
          </div>
        </section>

        {/* 4. MAIN WORKSPACE GRID */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT: UPLOAD & SUMMARY CARD */}
          <div className="bg-white p-7 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                  <span>📂</span> Upload Data Source
                </h2>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                Pilih atau seret berkas data pemasaran format CSV untuk memulai kalkulasi metrik.
              </p>

              <div className="border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-xl p-8 text-center bg-slate-50/50 hover:bg-indigo-50/30 transition-all cursor-pointer group">
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  id="csv-upload"
                  onChange={handleCSVUpload}
                />
                <label htmlFor="csv-upload" className="cursor-pointer flex flex-col items-center">
                  <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-indigo-600 mb-3 group-hover:scale-110 group-hover:border-indigo-400 transition-all shadow-sm text-xl font-bold">
                    📄
                  </div>
                  <span className="text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 px-5 py-2.5 rounded-xl transition-all shadow-md shadow-indigo-600/20">
                    Browse CSV File
                  </span>
                  <span className="text-[11px] text-slate-500 font-semibold mt-3">
                    Support CSV up to 10MB
                  </span>
                </label>
              </div>
            </div>

            {/* DATASET SUMMARY */}
            {datasetMeta.isLoaded ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between text-emerald-800 font-extrabold text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                    Dataset Loaded Successfully
                  </span>
                  <span>✓</span>
                </div>
                <div className="text-xs text-slate-700 space-y-1.5 font-medium pt-2 border-t border-emerald-200/60">
                  <p className="flex justify-between">
                    <span className="text-slate-500">File Name:</span> 
                    <span className="font-bold text-slate-900 truncate max-w-[150px]">{datasetMeta.fileName}</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-slate-500">Rows Processed:</span> 
                    <span className="font-bold text-slate-900">{datasetMeta.rows.toLocaleString("id-ID")}</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-slate-500">Columns Detected:</span> 
                    <span className="font-bold text-slate-900">{datasetMeta.cols}</span>
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500 font-semibold">
                Waiting for dataset upload...
              </div>
            )}
          </div>

          {/* RIGHT: AI BUSINESS INSIGHT CONTAINER */}
          <div className="lg:col-span-2 bg-white p-7 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <span>🤖</span> AI Business Executive Summary
              </h2>
              
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-3 py-1 rounded-lg hidden sm:inline-block">
                  Engine: GPT-4o / Analytics
                </span>

                {/* TOMBOL EXPORT PDF */}
                {aiInsight && (
                  <button
                    onClick={handleExportPDF}
                    className="text-[11px] font-extrabold bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
                  >
                    <span>📥</span> Export PDF
                  </button>
                )}
              </div>
            </div>

            <div
              id="ai-summary-card"
              className="flex-1 min-h-[240px] rounded-xl border border-slate-200/80 bg-slate-50/50 p-6 flex flex-col justify-center relative overflow-hidden"
            >
              {/* KONDISI 1: SEDANG LOADING */}
              {isGenerating ? (
                <div className="flex flex-col items-center justify-center text-center py-8 space-y-3">
                  <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-sm font-extrabold text-slate-900">Menganalisis Dataset Anda...</p>
                  <p className="text-xs text-slate-500 font-medium">AI sedang memproses pola pelanggan dan tingkat efisiensi kampanye.</p>
                </div>
              ) : aiInsight ? (
                /* KONDISI 2: AI INSIGHT BERHASIL DI-GENERATE */
                <div className="space-y-5">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-md">
                      Executive Overview
                    </span>
                    <p className="text-xs font-bold text-slate-800 leading-relaxed mt-2">
                      {aiInsight.summary}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-xl border border-slate-200/80 space-y-2">
                      <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                        <span>📊</span> Key Data Highlights
                      </h4>
                      <ul className="text-[11px] font-medium text-slate-600 space-y-1.5 list-disc pl-4">
                        {aiInsight.highlights.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-200/80 space-y-2">
                      <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                        <span>🎯</span> Strategic Action Plan
                      </h4>
                      <ul className="text-[11px] font-medium text-slate-600 space-y-1.5 list-disc pl-4">
                        {aiInsight.recommendations.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={handleGenerateInsight}
                      className="text-[11px] font-extrabold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
                    >
                      🔄 Regenerate Insight
                    </button>
                  </div>
                </div>
              ) : (
                /* KONDISI 3: BELUM DIPROSES / STANDBY */
                <div className="flex flex-col items-center justify-center text-center p-4">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center text-2xl mb-4 shadow-sm">
                    💡
                  </div>
                  <p className="text-base font-extrabold text-slate-900">
                    {datasetMeta.isLoaded ? "Data Siap Di-Sintesis AI" : "Belum Ada Data Terdeteksi"}
                  </p>
                  <p className="text-xs text-slate-600 mt-2 max-w-md leading-relaxed font-medium">
                    {datasetMeta.isLoaded
                      ? "Sistem siap mengekstraksi insight bisnis, segmentasi profitabilitas, serta rekomendasi penghematan budget iklan."
                      : "Unggah file CSV di panel sebelah kiri untuk membuka fitur rekomendasi strategi otomatis."}
                  </p>

                  {datasetMeta.isLoaded && (
                    <button
                      onClick={handleGenerateInsight}
                      className="mt-6 px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-xs font-black rounded-xl transition-all shadow-md shadow-indigo-600/20 tracking-wide uppercase active:scale-95 cursor-pointer"
                    >
                      🤖 Generate AI Insight Now
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* 5. GRAFIK VISUAL INTERAKTIF (RECHARTS) */}
        {datasetMeta.isLoaded && (
          <section className="space-y-6">
            <div className="border-b border-slate-200/80 pb-4">
              <h2 className="text-xl font-black text-slate-900">Interactive Visual Analytics</h2>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Visualisasi distribusi pendapatan berdasarkan tingkat pendidikan dan tingkat konversi per saluran kampanye.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* CHART 1: INCOME BY EDUCATION */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <span>🎓</span> Avg Income by Education Level (IDR)
                </h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={educationChartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="education" tick={{ fontSize: 11, fontWeight: 600 }} />
                      <YAxis
                        tick={{ fontSize: 10 }}
                        tickFormatter={(val) => `Rp${(val / 1000000).toFixed(0)}M`}
                      />
                      <Tooltip
                        formatter={(val: any) => [`Rp${Number(val).toLocaleString("id-ID")}`, "Rata-rata Pendapatan"]}
                        contentStyle={{ borderRadius: "12px", fontSize: "12px", fontWeight: "bold" }}
                      />
                      <Bar dataKey="avgIncome" radius={[6, 6, 0, 0]}>
                        {educationChartData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* CHART 2: CAMPAIGN CONVERSION PERFORMANCE */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <span>🚀</span> Conversion Rate by Campaign Channel (%)
                </h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={campaignChartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 600 }} />
                      <YAxis tick={{ fontSize: 10 }} unit="%" />
                      <Tooltip
                        formatter={(val: any) => [`${val}%`, "Tingkat Konversi"]}
                        contentStyle={{ borderRadius: "12px", fontSize: "12px", fontWeight: "bold" }}
                      />
                      <Bar dataKey="rate" radius={[6, 6, 0, 0]}>
                        {campaignChartData.map((_, index) => (
                          <Cell key={`cmp-cell-${index}`} fill={chartColors[(index + 2) % chartColors.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* 6. CAMPAIGN RESPONSE BREAKDOWN */}
        {datasetMeta.isLoaded && (
          <section className="bg-white p-7 rounded-2xl border border-slate-200/80 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">
                  Campaign Conversion Breakdown
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Perbandingan rasio pelanggan yang merespon penawaran vs yang menolak.
                </p>
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full self-start sm:self-auto">
                Live Dataset Visual
              </span>
            </div>

            <div className="space-y-5 pt-2">
              <div>
                <div className="flex justify-between text-xs font-extrabold text-slate-900 mb-2">
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-md bg-emerald-500 inline-block"></span>
                    Accepted Offer (Converted)
                  </span>
                  <span>{campaignSuccess}% ({Math.round((totalCustomers * campaignSuccess) / 100).toLocaleString("id-ID")} customers)</span>
                </div>
                <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-700 shadow-sm"
                    style={{ width: `${campaignSuccess}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-extrabold text-slate-900 mb-2">
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-md bg-rose-500 inline-block"></span>
                    Rejected Offer (Non-Converted)
                  </span>
                  <span>{100 - campaignSuccess}% ({Math.round((totalCustomers * (100 - campaignSuccess)) / 100).toLocaleString("id-ID")} customers)</span>
                </div>
                <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                  <div
                    className="h-full bg-gradient-to-r from-rose-500 to-amber-500 rounded-full transition-all duration-700 shadow-sm"
                    style={{ width: `${100 - campaignSuccess}%` }}
                  />
                </div>
              </div>
            </div>
          </section>
        )}

        {/* 7. DATA PREVIEW TABLE */}
        {datasetMeta.isLoaded && (
          <section className="bg-white p-7 rounded-2xl border border-slate-200/80 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                  <span>🔍</span> Raw Dataset Preview (Sample Rows)
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Menampilkan 8 baris pertama untuk memverifikasi struktur dan isi kolom data.
                </p>
              </div>
              <span className="text-[11px] font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-full">
                {previewRows.length} Sample Rows
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs font-medium text-slate-700">
                <thead className="bg-slate-100/80 text-slate-900 uppercase font-black tracking-wider text-[10px] border-b border-slate-200">
                  <tr>
                    {previewCols.map((col, idx) => (
                      <th key={idx} className="px-4 py-3 whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70 bg-white">
                  {previewRows.map((row, rowIdx) => (
                    <tr key={rowIdx} className="hover:bg-slate-50/80 transition-colors">
                      {previewCols.map((col, colIdx) => (
                        <td key={colIdx} className="px-4 py-2.5 whitespace-nowrap">
                          {row[col] !== undefined && row[col] !== "" ? String(row[col]) : "-"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* 8. VALUE PROPOSITION SECTION */}
        <section className="pt-8 border-t border-slate-200/80 space-y-8">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              Why Upgrade to MarketMind AI?
            </h2>
            <p className="text-xs text-slate-500 font-semibold">
              Transformasi data mentah menjadi keunggulan kompetitif tim pemasaran Anda.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-3 hover:border-indigo-300 transition-all">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-lg">
                ⚡
              </div>
              <h3 className="text-sm font-extrabold text-slate-900">Instant Data Processing</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Pemrosesan data instan di sisi browser tanpa delay server. Hasil kalkulasi KPI langsung ditampilkan secara real-time.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-3 hover:border-emerald-300 transition-all">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-lg">
                🎯
              </div>
              <h3 className="text-sm font-extrabold text-slate-900">Prescriptive Business Insights</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Tidak hanya angka deskriptif. Sistem memberikan arahan alokasi budget iklan serta segmen mana yang berisiko churn.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-3 hover:border-purple-300 transition-all">
              <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 text-purple-600 flex items-center justify-center font-bold text-lg">
                🔒
              </div>
              <h3 className="text-sm font-extrabold text-slate-900">Enterprise Grade Security</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Data CSV di-parse langsung di lokal memori browser. Kerahasiaan data pelanggan bisnis Anda terjamin 100%.
              </p>
            </div>
          </div>
        </section>

        {/* 9. ALUR CARA PENGGUNAAN (HOW IT WORKS) */}
        <section className="pt-8 border-t border-slate-200/80 space-y-8">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <span className="text-[10px] font-black tracking-widest uppercase bg-indigo-50 text-indigo-700 border border-indigo-200 px-3 py-1 rounded-full">
              Quick Guide
            </span>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              Easiest Way to Use MarketMind AI
            </h2>
            <p className="text-xs text-slate-500 font-semibold">
              Hanya butuh 3 langkah sederhana untuk mengubah file CSV menjadi keputusan bisnis strategis.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4 relative flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-xl font-black shadow-md shadow-indigo-600/20">
                    📂
                  </div>
                  <span className="text-2xl font-black text-slate-200">01</span>
                </div>
                <h3 className="text-base font-extrabold text-slate-900">Unggah File CSV</h3>
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  Pilih atau seret berkas data pemasaran Anda ke area dropzone yang tersedia di panel sebelah kiri.
                </p>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center gap-2 text-[11px] font-bold text-indigo-600">
                <span>Format: .CSV</span> • <span>Maksimal 10MB</span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4 relative flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center text-xl font-black shadow-md shadow-amber-500/20">
                    ⚡
                  </div>
                  <span className="text-2xl font-black text-slate-200">02</span>
                </div>
                <h3 className="text-base font-extrabold text-slate-900">Kalkulasi Otomatis</h3>
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  Sistem secara instan membaca total pelanggan, pendapatan rata-rata, serta tingkat konversi kampanye Anda.
                </p>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center gap-2 text-[11px] font-bold text-amber-600">
                <span>Proses Real-Time</span> • <span>Sisi Browser</span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4 relative flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center text-xl font-black shadow-md shadow-emerald-600/20">
                    🤖
                  </div>
                  <span className="text-2xl font-black text-slate-200">03</span>
                </div>
                <h3 className="text-base font-extrabold text-slate-900">Dapatkan AI Insight</h3>
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  Klik tombol sintesis untuk mengekstraksi analisis eksekutif dan rekomendasi efisiensi budget pemasaran.
                </p>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center gap-2 text-[11px] font-bold text-emerald-600">
                <span>Rekomendasi Taktis</span> • <span>Siap Eksekusi</span>
              </div>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}
