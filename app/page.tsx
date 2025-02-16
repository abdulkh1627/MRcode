"use client";

import { createClient } from "@supabase/supabase-js";
import { useRef, useState } from "react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
);

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [serviceOrderId, setServiceOrderId] = useState("");
  const [workcenter, setWorkcenter] = useState("");
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error("Gagal mengakses kamera:", error);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext("2d");
      if (context) {
        context.drawImage(videoRef.current, 0, 0, 300, 300);
        canvasRef.current.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], "captured-image.jpg", { type: "image/jpeg" });
            setFile(file);
            setPreview(URL.createObjectURL(file));
          }
        }, "image/jpeg");
      }
    }
  };

  const uploadFile = async () => {
    if (!file || !serviceOrderId || !workcenter) {
      alert("Harap isi Service Order ID dan Workcenter sebelum mengunggah file.");
      return;
    }
    
    setUploading(true);
    
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const { data, error } = await supabase.storage
      .from("uploads")
      .upload(`${serviceOrderId}/${fileName}`, file);

    if (error) {
      console.error("Upload gagal:", error.message);
      alert("Gagal mengunggah file: " + error.message);
    } else {
      const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/uploads/${serviceOrderId}/${fileName}`;
      await supabase.from("service_orders").insert({
        service_order: serviceOrderId,
        tanggal: new Date().toISOString(),
        workcenter: workcenter,
        gambar_url: publicUrl
      });
      alert("File berhasil diunggah!");
    }

    setUploading(false);
    setPreview(null);
  };

  const searchServiceOrder = async () => {
    if (!serviceOrderId) {
      alert("Masukkan Service Order ID untuk mencari file.");
      return;
    }
  
    const { data, error } = await supabase
      .from("service_orders")
      .select("gambar_url")
      .eq("service_order", serviceOrderId);
  
    if (error) {
      console.error("Gagal mencari file:", error.message);
      alert("Gagal mencari file: " + error.message);
      return;
    }
  
    if (data.length === 0) {
      alert("Tidak ada file ditemukan untuk Service Order ID ini.");
      return;
    }
  
    setSearchResults(data.map(entry => entry.gambar_url));
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      <label htmlFor="serviceOrderId" className="block text-sm font-medium text-gray-700">Service Order ID</label>
      <input type="text" id="serviceOrderId" value={serviceOrderId} onChange={(e) => setServiceOrderId(e.target.value)} className="border p-2 w-full mb-2" placeholder="Masukkan Service Order ID" />
      <label htmlFor="workcenter" className="block text-sm font-medium text-gray-700">Workcenter</label>
      <input type="text" id="workcenter" value={workcenter} onChange={(e) => setWorkcenter(e.target.value)} className="border p-2 w-full mb-2" placeholder="Masukkan Workcenter" />
      <label htmlFor="fileUpload" className="block text-sm font-medium text-gray-700">Upload File</label>
      <input type="file" id="fileUpload" onChange={handleFileChange} accept="image/*,application/pdf" />
      <button onClick={startCamera} className="bg-green-500 text-white px-4 py-2 mt-2 rounded">Buka Kamera</button>
      <video ref={videoRef} className="w-full h-auto mt-2" autoPlay></video>
      <button onClick={capturePhoto} className="bg-yellow-500 text-white px-4 py-2 mt-2 rounded">Ambil Foto</button>
      <canvas ref={canvasRef} className="hidden"></canvas>
      <button onClick={uploadFile} disabled={uploading} className="bg-blue-500 text-white px-4 py-2 mt-2 rounded">
        {uploading ? "Uploading..." : "Upload File"}
      </button>
      <button onClick={searchServiceOrder} className="bg-blue-500 text-white px-4 py-2 mt-2 rounded ml-2">Cari Service Order</button>
      {searchResults.length > 0 && (
        <div className="mt-4">
          <h3 className="text-lg font-bold">Hasil Pencarian</h3>
          {searchResults.map((fileUrl, index) => {
            const isPDF = fileUrl.toLowerCase().endsWith(".pdf");
            return (
              <div key={index} className="mt-2 p-2 border rounded shadow">
                {isPDF ? (
                  <embed src={fileUrl} type="application/pdf" className="w-full h-96" />
                ) : (
                  <img src={fileUrl} alt={`File ${index + 1}`} className="w-full h-auto" />
                )}
                <p className="text-sm text-gray-600 mt-1">File: <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">{fileUrl}</a></p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
