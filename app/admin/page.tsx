"use client";

import { useState, useEffect } from "react";
import { Lock, Image as ImageIcon, CreditCard, RefreshCw, Download, Eye, EyeOff, Trash2, ArrowLeft, MoreVertical } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface Log {
    id: string;
    timestamp: string;
    ip: string;
    country: string;
    originalUrl?: string; // Add optional as legacy might miss it
    basicUrl: string;
    advancedUrl: string;
    ratings: { basic: number; advanced: number };
    isPaid: boolean;
    downloaded: boolean;
    hidden: boolean;
}

export default function AdminPage() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [logs, setLogs] = useState<Log[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [settings, setSettings] = useState<{ autoPublish: boolean }>({ autoPublish: true });

    // New State for Users
    const [viewMode, setViewMode] = useState<"logs" | "users">("logs");
    const [users, setUsers] = useState<any[]>([]);

    // View State
    const [page, setPage] = useState(1);
    const itemsPerPage = 50;

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (password.trim() === "Humanscape1!") {
            setIsAuthenticated(true);
            fetchStats();
        } else {
            alert("Incorrect Password");
        }
    };

    const fetchStats = async () => {
        setLoading(true);
        try {
            const [statsRes, usersRes] = await Promise.all([
                fetch("/api/admin/stats"),
                fetch("/api/admin/users")
            ]);

            const statsData = await statsRes.json();
            const usersData = await usersRes.json();

            if (statsData.history) {
                const sorted = statsData.history.sort((a: Log, b: Log) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                setLogs(sorted);
                calculateStats(sorted);
            }
            if (usersData.users) {
                setUsers(usersData.users);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isAuthenticated) {
            // Fetch Settings
            fetch("/api/admin/settings").then(res => res.json()).then(data => setSettings(data));
        }
    }, [isAuthenticated]);

    const calculateStats = (history: Log[]) => {
        const total = history.length;
        const totalPaid = history.filter(h => h.isPaid).length;
        const totalDownloads = history.filter(h => h.downloaded).length;

        // Group by Country
        const countryStats: Record<string, { total: number, paid: number }> = {};
        history.forEach(h => {
            const c = h.country || "Unknown";
            if (!countryStats[c]) countryStats[c] = { total: 0, paid: 0 };
            countryStats[c].total++;
            if (h.isPaid) countryStats[c].paid++;
        });

        // Calc Avg Ratings
        let basicSum = 0, basicCount = 0;
        let advSum = 0, advCount = 0;

        history.forEach(h => {
            if (h.ratings?.basic) { basicSum += h.ratings.basic; basicCount++; }
            if (h.ratings?.advanced) { advSum += h.ratings.advanced; advCount++; }
        });

        setStats({
            total,
            totalPaid,
            totalDownloads,
            conversionRate: total > 0 ? ((totalPaid / total) * 100).toFixed(1) : "0.0",
            downloadRate: total > 0 ? ((totalDownloads / total) * 100).toFixed(1) : "0.0",
            avgBasic: basicCount > 0 ? (basicSum / basicCount).toFixed(1) : "N/A",
            avgAdv: advCount > 0 ? (advSum / advCount).toFixed(1) : "N/A",
            countryStats
        });
    };

    const handleAction = async (id: string, action: string) => {
        if (!id) { alert("Error: No ID found for this item."); return; }
        if (!confirm(`Are you sure you want to ${action}?`)) return;

        try {
            const res = await fetch("/api/admin/actions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, action })
            });
            const data = await res.json();

            if (res.ok) {
                // Optimistic Update
                if (action === "delete") {
                    setLogs(prev => prev.filter(l => l.id !== id));
                } else if (action === "hide" || action === "unhide") {
                    setLogs(prev => prev.map(l => l.id === id ? { ...l, hidden: (action === "hide") } : l));
                }
                // Refetch to be safe
                setTimeout(fetchStats, 500);
            } else {
                alert(`Failed: ${data.error}`);
            }
        } catch (e) {
            console.error(e);
            alert("Network Error");
        }
    };

    const exportCSV = () => {
        if (viewMode === "logs") {
            if (!logs.length) return;
            const headers = ["ID", "Time", "Country", "IP", "Basic Rating", "Adv Rating", "Paid", "Hidden", "Original URL", "Basic URL", "Adv URL"];
            const rows = logs.map(l => [
                l.id,
                new Date(l.timestamp).toLocaleString(),
                l.country,
                l.ip,
                l.ratings?.basic || 0,
                l.ratings?.advanced || 0,
                l.isPaid ? "Yes" : "No",
                l.hidden ? "Yes" : "No",
                l.originalUrl || "",
                l.basicUrl,
                l.advancedUrl
            ]);

            const csvContent = "data:text/csv;charset=utf-8,"
                + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");

            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", `bomee_logs_${new Date().toISOString()}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else {
            if (!users.length) return;
            const headers = ["ID", "Email", "Type", "Credits", "Business Name", "Created At", "Images", "Transactions"];
            const rows = users.map(u => [
                u.id,
                u.email,
                u.userType,
                u.credits,
                u.businessName || "",
                new Date(u.createdAt).toLocaleString(),
                u.imagesCount,
                u.transactionsCount
            ]);

            const csvContent = "data:text/csv;charset=utf-8,"
                + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");

            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", `bomee_users_${new Date().toISOString()}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const toggleAutoPublish = async () => {
        // Optimistic update
        const newValue = !settings.autoPublish;
        setSettings(prev => ({ ...prev, autoPublish: newValue }));
        try {
            await fetch("/api/admin/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ autoPublish: newValue })
            });
        } catch (e: any) {
            console.error("Failed to save settings", e);
            setSettings(prev => ({ ...prev, autoPublish: !newValue }));
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 flex-col gap-4">
                <Link href="/" className="flex items-center gap-2 text-gray-500 hover:text-purple-600 transition-colors mb-4">
                    <ArrowLeft className="w-4 h-4" /> Back to Home
                </Link>
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 w-full max-w-md">
                    <form onSubmit={handleLogin} className="space-y-4">
                        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <Lock className="w-5 h-5 text-purple-600" />
                            Admin Access
                        </h2>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter Password"
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                        />
                        <button type="submit" className="w-full py-2 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800">
                            Login
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    const paginatedLogs = logs.slice((page - 1) * itemsPerPage, page * itemsPerPage);

    return (
        <div className="min-h-screen bg-gray-50 p-6 md:p-12 font-sans text-gray-900">
            <div className="max-w-7xl mx-auto space-y-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Dashboard (DB Mode)</h1>
                        <p className="text-gray-500">Centralized Database Management</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <Link href="/" className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                            Back to App
                        </Link>
                        <button onClick={exportCSV} className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors flex items-center gap-2">
                            <Download className="w-4 h-4" /> Export {viewMode === "logs" ? "Logs" : "Users"}
                        </button>
                        <button onClick={fetchStats} className="p-2 hover:bg-white rounded-full transition-colors"><RefreshCw className="w-5 h-5 text-gray-500" /></button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-4 border-b border-gray-200 pb-1">
                    <button onClick={() => setViewMode("logs")} className={cn("px-4 py-2 font-medium text-sm transition-colors relative", viewMode === "logs" ? "text-purple-600 after:absolute after:bottom-[-5px] after:left-0 after:w-full after:h-0.5 after:bg-purple-600" : "text-gray-500 hover:text-gray-700")}>
                        Generation Logs
                    </button>
                    <button onClick={() => setViewMode("users")} className={cn("px-4 py-2 font-medium text-sm transition-colors relative", viewMode === "users" ? "text-purple-600 after:absolute after:bottom-[-5px] after:left-0 after:w-full after:h-0.5 after:bg-purple-600" : "text-gray-500 hover:text-gray-700")}>
                        Users ({users.length})
                    </button>
                </div>

                {/* Settings & View Control based on Tab */}
                {viewMode === "logs" && (
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-4 w-full md:w-auto">
                            <div className="p-3 bg-purple-50 rounded-xl">
                                <Eye className="w-6 h-6 text-purple-600" />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900">Gallery Auto-Publish</h3>
                                <p className="text-sm text-gray-500">Automatically add new generations to the public gallery.</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-6">
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" checked={settings.autoPublish} onChange={toggleAutoPublish} className="sr-only peer" />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                                <span className="ml-3 text-sm font-medium text-gray-900">{settings.autoPublish ? "On" : "Off"}</span>
                            </label>
                        </div>
                    </div>
                )}

                {/* Stats Grid - Only show in logs view for now */}
                {viewMode === "logs" && stats && (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        <div className="bg-white p-4 rounded-xl border shadow-sm">
                            <p className="text-xs text-gray-500 uppercase font-bold">Total</p>
                            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                        </div>
                        <div className="bg-white p-4 rounded-xl border shadow-sm">
                            <p className="text-xs text-gray-500 uppercase font-bold">Paid</p>
                            <p className="text-2xl font-bold text-green-600">{stats.totalPaid} ({stats.conversionRate}%)</p>
                        </div>
                        <div className="bg-white p-4 rounded-xl border shadow-sm">
                            <p className="text-xs text-gray-500 uppercase font-bold">Avg Basic</p>
                            <p className="text-2xl font-bold text-orange-500">★ {stats.avgBasic}</p>
                        </div>
                        <div className="bg-white p-4 rounded-xl border shadow-sm">
                            <p className="text-xs text-gray-500 uppercase font-bold">Avg Adv</p>
                            <p className="text-2xl font-bold text-orange-500">★ {stats.avgAdv}</p>
                        </div>
                    </div>
                )}

                {/* Main Content Area */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    {viewMode === "users" ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 text-gray-500 font-medium uppercase text-xs">
                                    <tr>
                                        <th className="px-6 py-3">User (Email / Business)</th>
                                        <th className="px-6 py-3">Type</th>
                                        <th className="px-6 py-3">Credits</th>
                                        <th className="px-6 py-3">Stats (Gen / Tx)</th>
                                        <th className="px-6 py-3">Joined</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {users.map((u) => (
                                        <tr key={u.id} className="hover:bg-gray-50/50">
                                            <td className="px-6 py-3">
                                                <div>
                                                    <div className="font-medium text-gray-900">{u.email}</div>
                                                    {u.businessName && <div className="text-xs text-gray-500">{u.businessName}</div>}
                                                </div>
                                            </td>
                                            <td className="px-6 py-3">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 capitalize">
                                                    {u.userType?.toLowerCase() || "Individual"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3 font-bold text-purple-600">{u.credits}</td>
                                            <td className="px-6 py-3 text-gray-600">{u.imagesCount} Gen / {u.transactionsCount} Tx</td>
                                            <td className="px-6 py-3 text-gray-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        // Default Logs View
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 text-gray-500 font-medium uppercase text-xs">
                                    <tr>
                                        <th className="px-4 py-3">Images (Orig / Basic / Adv)</th>
                                        <th className="px-4 py-3">Meta (Time / IP)</th>
                                        <th className="px-4 py-3">Ratings</th>
                                        <th className="px-4 py-3">Status</th>
                                        <th className="px-4 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {paginatedLogs.map((log) => (
                                        <tr key={log.id} className="hover:bg-gray-50/50">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    {/* Original */}
                                                    <a href={log.originalUrl} target="_blank" className="relative w-12 h-12 bg-gray-100 rounded-lg overflow-hidden border hover:ring-2 ring-purple-500 transition-all group shrink-0" title="Original">
                                                        {log.originalUrl && (
                                                            // eslint-disable-next-line @next/next/no-img-element
                                                            <img
                                                                src={log.originalUrl}
                                                                alt="Orig"
                                                                className="object-cover w-full h-full"
                                                                onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement?.classList.add('flex', 'items-center', 'justify-center', 'bg-gray-200'); e.currentTarget.parentElement!.innerHTML = '<span class="text-[8px] text-gray-400 font-bold">404</span>'; }}
                                                            />
                                                        )}
                                                        {!log.originalUrl && <div className="w-full h-full flex items-center justify-center text-gray-300 text-[8px]">N/A</div>}
                                                        <span className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[8px] text-center opacity-0 group-hover:opacity-100 transition-opacity">ORIG</span>
                                                    </a>
                                                    {/* Basic */}
                                                    <a href={log.basicUrl} target="_blank" className="relative w-12 h-12 bg-gray-100 rounded-lg overflow-hidden border hover:ring-2 ring-purple-500 transition-all group shrink-0" title="Basic">
                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                        <img
                                                            src={log.basicUrl}
                                                            alt="Basic"
                                                            className="object-cover w-full h-full"
                                                            onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement?.classList.add('flex', 'items-center', 'justify-center', 'bg-gray-200'); e.currentTarget.parentElement!.innerHTML = '<span class="text-[8px] text-gray-400 font-bold">404</span>'; }}
                                                        />
                                                        <span className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[8px] text-center opacity-0 group-hover:opacity-100 transition-opacity">BASIC</span>
                                                    </a>
                                                    {/* Advanced */}
                                                    <a href={log.advancedUrl} target="_blank" className="relative w-12 h-12 bg-gray-100 rounded-lg overflow-hidden border hover:ring-2 ring-purple-500 transition-all group shrink-0" title="Advanced">
                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                        <img
                                                            src={log.advancedUrl}
                                                            alt="Adv"
                                                            className="object-cover w-full h-full"
                                                            onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement?.classList.add('flex', 'items-center', 'justify-center', 'bg-gray-200'); e.currentTarget.parentElement!.innerHTML = '<span class="text-[8px] text-gray-400 font-bold">404</span>'; }}
                                                        />
                                                        <span className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[8px] text-center opacity-0 group-hover:opacity-100 transition-opacity">ADV</span>
                                                    </a>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-gray-900">{new Date(log.timestamp).toLocaleDateString()}</span>
                                                    <span className="text-xs text-gray-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                                                    <div className="flex items-center gap-1 mt-1">
                                                        <span className="text-[10px] bg-gray-100 px-1.5 rounded">{log.country}</span>
                                                        <span className="text-[10px] text-gray-400 truncate max-w-[100px]" title={log.ip}>{log.ip}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="space-y-1">
                                                    {log.ratings?.basic ? <div className="text-xs"><span className="text-gray-400">B:</span> <span className="font-bold text-orange-500">★{log.ratings.basic}</span></div> : null}
                                                    {log.ratings?.advanced ? <div className="text-xs"><span className="text-gray-400">A:</span> <span className="font-bold text-orange-500">★{log.ratings.advanced}</span></div> : null}
                                                    {!log.ratings?.basic && !log.ratings?.advanced && <span className="text-xs text-gray-300">-</span>}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-col gap-1">
                                                    {log.isPaid ? (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 w-fit">Paid</span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 w-fit">Free</span>
                                                    )}
                                                    {log.hidden && (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 w-fit">Hidden</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => handleAction(log.id, log.hidden ? "unhide" : "hide")}
                                                        className={cn("p-2 rounded-lg transition-colors border", log.hidden ? "bg-red-50 border-red-200 text-red-600" : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50")}
                                                        title={log.hidden ? "Unhide" : "Hide"}
                                                    >
                                                        {log.hidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                    </button>
                                                    <button
                                                        onClick={() => handleAction(log.id, "delete")}
                                                        className="p-2 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50"
                                                        title="Delete permanently"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {/* Pagination (only for logs for now) */}
                    {viewMode === "logs" && (
                        <div className="p-4 border-t border-gray-200 flex justify-between items-center bg-gray-50">
                            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-4 py-2 bg-white border rounded-lg disabled:opacity-50 text-sm">Previous</button>
                            <span className="text-sm text-gray-500">Page {page} of {Math.ceil(logs.length / itemsPerPage)}</span>
                            <button disabled={paginatedLogs.length < itemsPerPage && page * itemsPerPage >= logs.length} onClick={() => setPage(p => p + 1)} className="px-4 py-2 bg-white border rounded-lg disabled:opacity-50 text-sm">Next</button>
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
}
