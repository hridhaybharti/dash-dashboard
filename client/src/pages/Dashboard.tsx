import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { 
  Shield, 
  Upload, 
  Search, 
  Database, 
  Hash, 
  Globe, 
  Clock, 
  FileText,
  Loader2,
  AlertCircle,
  Plus
} from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { Entry } from "../../shared/schema";

const API_BASE = "http://localhost:5000/api";

export default function Dashboard() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Fetch entries
  const { data: entries, isLoading: isEntriesLoading } = useQuery<Entry[]>({
    queryKey: ["entries", searchTerm, activeCategory],
    queryFn: async () => {
      const res = await axios.get(`${API_BASE}/entries`, {
        params: { q: searchTerm, category: activeCategory }
      });
      return res.data;
    },
  });

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ["stats"],
    queryFn: async () => {
      const res = await axios.get(`${API_BASE}/stats`);
      return res.data;
    },
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await axios.post(`${API_BASE}/upload`, formData);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entries"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
    }
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      uploadMutation.mutate(e.target.files[0]);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0c10] text-slate-200">
      {/* Sidebar / Nav */}
      <nav className="border-b border-white/5 bg-[#0d1117] px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600/20 rounded-lg">
            <Shield className="w-6 h-6 text-blue-500" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">Dash <span className="text-slate-500">v1.0</span></h1>
        </div>
        <div className="flex items-center gap-6 text-sm font-medium">
          <div className="flex items-center gap-4 text-slate-400">
            <div className="flex items-center gap-1.5">
              <Database className="w-4 h-4" />
              <span>{stats?.total || 0} Total</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Globe className="w-4 h-4" />
              <span>{stats?.ips || 0} IPs</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Hash className="w-4 h-4" />
              <span>{stats?.hashes || 0} Hashes</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-8 space-y-8">
        {/* Top Section: Upload & Search */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Search Box */}
          <div className="lg:col-span-2 relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
            </div>
            <input 
              type="text" 
              placeholder="Instant Search (IP or Hash)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-16 pl-12 bg-[#0d1117] border border-white/5 rounded-2xl text-lg font-mono placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all shadow-2xl"
            />
          </div>

          {/* Upload Button */}
          <label className="relative h-16 flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl cursor-pointer transition-all active:scale-[0.98] shadow-xl overflow-hidden group">
            {uploadMutation.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Upload className="w-5 h-5" />
                <span className="font-bold uppercase tracking-widest text-sm">Upload Spreadsheet</span>
              </>
            )}
            <input type="file" className="hidden" accept=".csv,.xlsx,.xls" onChange={handleFileUpload} disabled={uploadMutation.isPending} />
            <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
          </label>
        </div>

        {/* Data Grid */}
        <div className="bg-[#0d1117] rounded-3xl border border-white/5 shadow-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
             <div className="flex gap-2">
                {['all', 'ip', 'hash'].map((cat) => (
                  <button 
                    key={cat}
                    onClick={() => setActiveCategory(cat === 'all' ? null : cat)}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${
                      (activeCategory || 'all') === cat 
                        ? 'bg-blue-600 text-white shadow-lg' 
                        : 'bg-white/5 text-slate-500 hover:bg-white/10'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
             </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-slate-500 text-xs font-bold uppercase tracking-widest bg-white/[0.01]">
                  <th className="px-6 py-4">Value</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Remark</th>
                  <th className="px-6 py-4 text-right">Added At</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence mode="popLayout">
                  {isEntriesLoading ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-20 text-center">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-slate-700" />
                      </td>
                    </tr>
                  ) : entries?.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-20 text-center text-slate-500 font-medium">
                        No results found in indexing.
                      </td>
                    </tr>
                  ) : (
                    entries?.map((item) => (
                      <motion.tr 
                        key={item.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors group"
                      >
                        <td className="px-6 py-4 font-mono text-sm">
                          <div className="flex items-center gap-3">
                            {item.category === 'ip' ? <Globe className="w-4 h-4 text-blue-500" /> : <Hash className="w-4 h-4 text-emerald-500" />}
                            <span className="text-white">{item.value}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] uppercase font-bold text-slate-400">
                            {item.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-400 max-w-md truncate italic">
                          {item.remark || "—"}
                        </td>
                        <td className="px-6 py-4 text-right text-xs text-slate-500 font-mono">
                          {format(new Date(item.timestamp), "yyyy-MM-dd HH:mm")}
                        </td>
                      </motion.tr>
                    ))
                  )}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
