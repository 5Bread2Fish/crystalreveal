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

    // New State for Users & Coupons
    const [viewMode, setViewMode] = useState<"logs" | "users" | "coupons" | "user_detail">("logs");
    const [users, setUsers] = useState<any[]>([]);
    const [coupons, setCoupons] = useState<any[]>([]);

    // Coupon Form
    const [couponForm, setCouponForm] = useState({
        name: "",
        discountType: "percent", // percent | amount
        value: "",
        duration: "once", // once | forever | repeating
        maxRedemptions: "",
        code: ""
    });

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
            const [statsRes, usersRes, couponsRes] = await Promise.all([
                fetch("/api/admin/stats"),
                fetch("/api/admin/users"),
                fetch("/api/admin/coupons")
            ]);

            const statsData = await statsRes.json();
            const usersData = await usersRes.json();
            const couponsData = await couponsRes.json();

            if (statsData.history) {
                const sorted = statsData.history.sort((a: Log, b: Log) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                setLogs(sorted);
                calculateStats(sorted);
            }
            if (usersData.users) {
                setUsers(usersData.users);
            }
            if (couponsData.coupons) {
                setCoupons(couponsData.coupons);
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

    const handleCreateCoupon = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch("/api/admin/coupons", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: couponForm.name,
                    percent_off: couponForm.discountType === "percent" ? couponForm.value : undefined,
                    amount_off: couponForm.discountType === "amount" ? couponForm.value : undefined,
                    duration: couponForm.duration,
                    max_redemptions: couponForm.maxRedemptions,
                    code: couponForm.code
                })
            });
            if (res.ok) {
                alert("Coupon Created!");
                fetchStats(); // Refresh
                setCouponForm({ name: "", discountType: "percent", value: "", duration: "once", maxRedemptions: "", code: "" });
            } else {
                const data = await res.json();
                alert(`Error: ${data.error}`);
            }
        } catch (error) {
            console.error(error);
            alert("Failed to create coupon");
        }
    };

    const handleDeleteCoupon = async (id: string) => {
        if (!confirm("Are you sure you want to delete this coupon? This cannot be undone.")) return;
        try {
            await fetch(`/api/admin/coupons/${id}`, { method: "DELETE" });
            fetchStats();
        } catch (e) {
            alert("Failed to delete");
        }
    };

    // Detail View State
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [userDetail, setUserDetail] = useState<any>(null);

    const fetchUserDetails = async (id: string) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/users/${id}`);
            const data = await res.json();
            if (data.user) {
                setUserDetail(data);
                setSelectedUserId(id);
                setViewMode("user_detail");
            }
        } catch (e) {
            console.error(e);
            alert("Failed to fetch user details");
        } finally {
            setLoading(false);
        }
    };

    const closeDetailView = () => {
        setSelectedUserId(null);
        setUserDetail(null);
        setViewMode("users");
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
                        {viewMode !== "user_detail" && (
                            <button onClick={exportCSV} className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors flex items-center gap-2">
                                <Download className="w-4 h-4" /> Export {viewMode === "logs" ? "Logs" : "Users"}
                            </button>
                        )}
                        <button onClick={fetchStats} className="p-2 hover:bg-white rounded-full transition-colors"><RefreshCw className="w-5 h-5 text-gray-500" /></button>
                    </div>
                </div>

                {/* Tabs */}
                {viewMode !== "user_detail" && (
                    <div className="flex gap-4 border-b border-gray-200 pb-1">
                        <button onClick={() => setViewMode("logs")} className={cn("px-4 py-2 font-medium text-sm transition-colors relative", viewMode === "logs" ? "text-purple-600 after:absolute after:bottom-[-5px] after:left-0 after:w-full after:h-0.5 after:bg-purple-600" : "text-gray-500 hover:text-gray-700")}>
                            Generation Logs
                        </button>
                        <button onClick={() => setViewMode("users")} className={cn("px-4 py-2 font-medium text-sm transition-colors relative", viewMode === "users" ? "text-purple-600 after:absolute after:bottom-[-5px] after:left-0 after:w-full after:h-0.5 after:bg-purple-600" : "text-gray-500 hover:text-gray-700")}>
                            Users ({users.length})
                        </button>
                        <button onClick={() => setViewMode("coupons")} className={cn("px-4 py-2 font-medium text-sm transition-colors relative", viewMode === "coupons" ? "text-purple-600 after:absolute after:bottom-[-5px] after:left-0 after:w-full after:h-0.5 after:bg-purple-600" : "text-gray-500 hover:text-gray-700")}>
                            Coupons
                        </button>
                    </div>
                )}

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
                            <p className="text-xs text-gray-500 uppercase font-bold">Revenue</p>
                            <p className="text-2xl font-bold text-purple-600">${stats.totalRevenue}</p>
                        </div>
                        <div className="bg-white p-4 rounded-xl border shadow-sm">
                            <p className="text-xs text-gray-500 uppercase font-bold">Credits</p>
                            <p className="text-2xl font-bold text-gray-900">{stats.totalOutstandingCredits}</p>
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
                    {viewMode === "user_detail" && userDetail ? (
                        <div className="p-8">
                            <div className="flex items-center gap-4 mb-8">
                                <button onClick={closeDetailView} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                                </button>
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900">User Details</h2>
                                    <p className="text-gray-500">{userDetail.user.email}</p>
                                </div>
                            </div>

                            <div className="grid lg:grid-cols-3 gap-8">
                                {/* Profile Info */}
                                <div className="space-y-8">
                                    <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200">
                                        <h3 className="font-bold text-gray-900 mb-4">Profile Information</h3>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="text-xs text-gray-500 font-bold uppercase">User ID</label>
                                                <p className="text-sm font-mono text-gray-900 break-all">{userDetail.user.id}</p>
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-500 font-bold uppercase">Account Type</label>
                                                <p className="text-sm text-gray-900 capitalize">{userDetail.user.userType || "Individual"}</p>
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-500 font-bold uppercase">Credits</label>
                                                <p className="text-xl font-bold text-purple-600">{userDetail.user.credits}</p>
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-500 font-bold uppercase">Business Name</label>
                                                <p className="text-sm text-gray-900">{userDetail.user.businessName || "-"}</p>
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-500 font-bold uppercase">Phone</label>
                                                <p className="text-sm text-gray-900">{userDetail.user.phoneNumber || "-"}</p>
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-500 font-bold uppercase">Pregnancy Weeks</label>
                                                <p className="text-sm text-gray-900">{userDetail.user.pregnancyWeeks || "-"}</p>
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-500 font-bold uppercase">Scan Volume</label>
                                                <p className="text-sm text-gray-900">{userDetail.user.monthlyScanVolume || "-"}</p>
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-500 font-bold uppercase">Joined</label>
                                                <p className="text-sm text-gray-900">{new Date(userDetail.user.createdAt).toLocaleString()}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Detail Tabs (Gallery & Tx) */}
                                <div className="lg:col-span-2 space-y-8">
                                    {/* Gallery */}
                                    <div>
                                        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                            <ImageIcon className="w-5 h-5 text-gray-500" /> User Gallery ({userDetail.images.length})
                                        </h3>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                            {userDetail.images.map((img: any) => (
                                                <div key={img.id} className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden group relative">
                                                    <div className="aspect-square relative">
                                                        {img.advancedUrl ? (
                                                            // eslint-disable-next-line @next/next/no-img-element
                                                            <img src={img.advancedUrl} className={cn("w-full h-full object-cover", !img.unlocked && "blur-sm opacity-50")} alt="Gen" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">Processing</div>
                                                        )}
                                                        <div className="absolute top-2 right-2 flex gap-1">
                                                            <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-bold", img.unlocked ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700")}>
                                                                {img.unlocked ? "UNLOCKED" : "LOCKED"}
                                                            </span>
                                                        </div>
                                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                            <a href={img.originalUrl} target="_blank" className="text-white text-xs hover:underline">Orig</a>
                                                            <a href={img.basicUrl} target="_blank" className="text-white text-xs hover:underline">Basic</a>
                                                            <a href={img.advancedUrl} target="_blank" className="text-white text-xs hover:underline">Adv</a>
                                                        </div>
                                                    </div>
                                                    <div className="p-2 text-[10px] text-gray-500 flex justify-between">
                                                        <span>{new Date(img.createdAt).toLocaleDateString()}</span>
                                                        {img.unlockedAt && <span>Unit: {new Date(img.unlockedAt).toLocaleDateString()}</span>}
                                                    </div>
                                                </div>
                                            ))}
                                            {userDetail.images.length === 0 && <p className="text-gray-500 text-sm">No images generated.</p>}
                                        </div>
                                    </div>

                                    {/* Transactions */}
                                    <div>
                                        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                            <CreditCard className="w-5 h-5 text-gray-500" /> Transaction History
                                        </h3>
                                        <table className="w-full text-sm text-left border rounded-lg overflow-hidden">
                                            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                                                <tr>
                                                    <th className="px-4 py-2">Date</th>
                                                    <th className="px-4 py-2">Type</th>
                                                    <th className="px-4 py-2">Amount</th>
                                                    <th className="px-4 py-2 text-right">Credits</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {userDetail.transactions.map((tx: any) => (
                                                    <tr key={tx.id}>
                                                        <td className="px-4 py-2">{new Date(tx.createdAt).toLocaleDateString()}</td>
                                                        <td className="px-4 py-2">{tx.transactionType}</td>
                                                        <td className="px-4 py-2">{tx.amountPaid ? `$${tx.amountPaid}` : "-"}</td>
                                                        <td className={cn("px-4 py-2 text-right font-bold", tx.creditsChange > 0 ? "text-green-600" : "text-gray-900")}>
                                                            {tx.creditsChange > 0 ? "+" : ""}{tx.creditsChange}
                                                        </td>
                                                    </tr>
                                                ))}
                                                {userDetail.transactions.length === 0 && (
                                                    <tr><td colSpan={4} className="p-4 text-center text-gray-500">No transactions.</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : viewMode === "users" ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 text-gray-500 font-medium uppercase text-xs">
                                    <tr>
                                        <th className="px-6 py-3">User (Email / Business)</th>
                                        <th className="px-6 py-3">Type</th>
                                        <th className="px-6 py-3">Credits</th>
                                        <th className="px-6 py-3">Expires</th>
                                        <th className="px-6 py-3">Stats (Gen / Tx)</th>
                                        <th className="px-6 py-3">Joined</th>
                                        <th className="px-6 py-3 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {users.map((u) => (
                                        <tr key={u.id} className="hover:bg-gray-50/50 cursor-pointer" onClick={() => fetchUserDetails(u.id)}>
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
                                            <td className="px-6 py-3 text-gray-500 text-xs">
                                                {u.creditExpiresAt ? new Date(u.creditExpiresAt).toLocaleDateString() : "-"}
                                            </td>
                                            <td className="px-6 py-3 text-gray-600">{u.imagesCount} Gen / {u.transactionsCount} Tx</td>
                                            <td className="px-6 py-3 text-gray-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                                            <td className="px-6 py-3 text-right">
                                                <button onClick={(e) => { e.stopPropagation(); fetchUserDetails(u.id); }} className="text-purple-600 font-bold hover:underline">View</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : viewMode === "coupons" ? (
                        <div className="p-6">
                            {/* Create Form */}
                            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 mb-8">
                                <h3 className="font-bold text-lg mb-4">Create New Coupon</h3>
                                <form onSubmit={handleCreateCoupon} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    <input placeholder="Coupon Name (Internal)" value={couponForm.name} onChange={e => setCouponForm({ ...couponForm, name: e.target.value })} className="p-2 border rounded" required />
                                    <input placeholder="Code (e.g. SUMMER25)" value={couponForm.code} onChange={e => setCouponForm({ ...couponForm, code: e.target.value })} className="p-2 border rounded" required />

                                    <div className="flex gap-2">
                                        <select value={couponForm.discountType} onChange={e => setCouponForm({ ...couponForm, discountType: e.target.value })} className="p-2 border rounded">
                                            <option value="percent">Percentage (%)</option>
                                            <option value="amount">Amount ($)</option>
                                        </select>
                                        <input type="number" placeholder="Value" value={couponForm.value} onChange={e => setCouponForm({ ...couponForm, value: e.target.value })} className="p-2 border rounded w-full" required />
                                    </div>

                                    <select value={couponForm.duration} onChange={e => setCouponForm({ ...couponForm, duration: e.target.value })} className="p-2 border rounded">
                                        <option value="once">Once</option>
                                        <option value="forever">Forever</option>
                                        <option value="repeating">Repeating</option>
                                    </select>

                                    <input type="number" placeholder="Max Redemptions (Optional)" value={couponForm.maxRedemptions} onChange={e => setCouponForm({ ...couponForm, maxRedemptions: e.target.value })} className="p-2 border rounded" />

                                    <button type="submit" className="bg-purple-600 text-white font-bold p-2 rounded hover:bg-purple-700">Create Coupon</button>
                                </form>
                            </div>

                            {/* List */}
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 text-gray-500 font-medium uppercase text-xs">
                                    <tr>
                                        <th className="px-6 py-3">Name</th>
                                        <th className="px-6 py-3">Discount</th>
                                        <th className="px-6 py-3">Duration</th>
                                        <th className="px-6 py-3">Redemptions</th>
                                        <th className="px-6 py-3">Created</th>
                                        <th className="px-6 py-3 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {coupons.map((c) => (
                                        <tr key={c.id}>
                                            <td className="px-6 py-3 font-medium">{c.name}</td>
                                            <td className="px-6 py-3">
                                                {c.percent_off ? `${c.percent_off}% Off` : `$${(c.amount_off / 100).toFixed(2)} Off`}
                                            </td>
                                            <td className="px-6 py-3 capitalize">{c.duration}</td>
                                            <td className="px-6 py-3">{c.times_redeemed} {c.max_redemptions ? `/ ${c.max_redemptions}` : ""}</td>
                                            <td className="px-6 py-3">{new Date(c.created * 1000).toLocaleDateString()}</td>
                                            <td className="px-6 py-3 text-right">
                                                <button onClick={() => handleDeleteCoupon(c.id)} className="text-red-600 hover:text-red-800"><Trash2 className="w-4 h-4" /></button>
                                            </td>
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


