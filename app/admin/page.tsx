"use client";

import { useState, useEffect } from "react";
import { BarChart3, FileText, CreditCard, Users, Calendar, Search, Loader2, ArrowLeft, TrendingUp, DollarSign, Image as ImageIcon, UserCheck } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import Image from "next/image";

type TabType = "overview" | "generations" | "billing" | "users";

export default function AdminPage() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState("");
    const [activeTab, setActiveTab] = useState<TabType>("overview");
    const [loginError, setLoginError] = useState("");

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setLoginError(""); // Clear previous errors
        if (password.trim() === "Humanscape1!") {
            setIsAuthenticated(true);
            setPassword(""); // Clear password on success
        } else {
            setLoginError("Incorrect password. Please try again.");
            setPassword(""); // Clear password field
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-6">
                <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Users className="w-8 h-8 text-purple-600" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900">Admin Access</h1>
                        <p className="text-gray-500 text-sm mt-2">Enter password to continue</p>
                    </div>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Password"
                                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                            />
                            {loginError && (
                                <p className="text-red-500 text-sm mt-2">{loginError}</p>
                            )}
                        </div>
                        <button
                            type="submit"
                            className="w-full bg-purple-600 text-white py-3 rounded-xl font-bold hover:bg-purple-700 transition-colors"
                        >
                            Login
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link href="/" className="text-gray-600 hover:text-purple-600">
                                <ArrowLeft className="w-5 h-5" />
                            </Link>
                            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
                        </div>
                        <button
                            onClick={() => setIsAuthenticated(false)}
                            className="text-sm text-gray-600 hover:text-red-600"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="flex gap-8">
                        {[
                            { id: "overview", label: "Overview", icon: BarChart3 },
                            { id: "generations", label: "Generation Logs", icon: FileText },
                            { id: "billing", label: "Billing & Credits", icon: CreditCard },
                            { id: "users", label: "Users", icon: Users }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as TabType)}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-4 border-b-2 font-medium transition-colors",
                                    activeTab === tab.id
                                        ? "border-purple-600 text-purple-600"
                                        : "border-transparent text-gray-600 hover:text-gray-900"
                                )}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-6 py-8">
                {activeTab === "overview" && <OverviewTab />}
                {activeTab === "generations" && <GenerationsTab />}
                {activeTab === "billing" && <BillingTab />}
                {activeTab === "users" && <UsersTab />}
            </div>
        </div>
    );
}

function OverviewTab() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState({
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        fetchStats();
    }, [dateRange]);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/overview?startDate=${dateRange.start}&endDate=${dateRange.end}`);
            const data = await res.json();
            setStats(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Date Range Picker */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Date Range
                </h3>
                <div className="flex gap-4 items-center">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                        <input
                            type="date"
                            value={dateRange.start}
                            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                            className="px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                        <input
                            type="date"
                            value={dateRange.end}
                            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                            className="px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 outline-none"
                        />
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid md:grid-cols-3 gap-6">
                <StatCard
                    icon={DollarSign}
                    label="Credits Purchased"
                    value={stats?.creditsPurchased || 0}
                    color="green"
                />
                <StatCard
                    icon={ImageIcon}
                    label="Images Generated"
                    value={stats?.imagesGenerated || 0}
                    color="blue"
                />
                <StatCard
                    icon={ImageIcon}
                    label="Images Unlocked"
                    value={stats?.imagesUnlocked || 0}
                    color="purple"
                />
                <StatCard
                    icon={UserCheck}
                    label="Business Signups"
                    value={stats?.businessSignups || 0}
                    color="orange"
                />
                <StatCard
                    icon={Users}
                    label="Individual Signups"
                    value={stats?.individualSignups || 0}
                    color="indigo"
                />
                <StatCard
                    icon={TrendingUp}
                    label="Total Remaining Credits"
                    value={stats?.totalRemainingCredits || 0}
                    color="pink"
                />
            </div>
        </div>
    );
}

function StatCard({ icon: Icon, label, value, color }: {
    icon: any;
    label: string;
    value: number;
    color: "green" | "blue" | "purple" | "orange" | "indigo" | "pink"
}) {
    const colors: Record<string, string> = {
        green: "bg-green-100 text-green-600",
        blue: "bg-blue-100 text-blue-600",
        purple: "bg-purple-100 text-purple-600",
        orange: "bg-orange-100 text-orange-600",
        indigo: "bg-indigo-100 text-indigo-600",
        pink: "bg-pink-100 text-pink-600"
    };

    return (
        <div className="bg-white p-6 rounded-2xl border border-gray-200">
            <div className="flex items-center gap-3 mb-2">
                <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", colors[color])}>
                    <Icon className="w-5 h-5" />
                </div>
                <div className="text-sm font-medium text-gray-600">{label}</div>
            </div>
            <div className="text-3xl font-bold text-gray-900">{value.toLocaleString()}</div>
        </div>
    );
}

function GenerationsTab() {
    const [generations, setGenerations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState({ column: "email", value: "" });
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState<any>(null);

    useEffect(() => {
        fetchGenerations();
    }, [page]);

    const fetchGenerations = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: "50"
            });
            if (search.value) {
                params.append("search", search.column);
                params.append("value", search.value);
            }
            const res = await fetch(`/api/admin/generations?${params}`);
            const data = await res.json();
            setGenerations(data.generations || []);
            setPagination(data.pagination);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = () => {
        setPage(1);
        fetchGenerations();
    };

    return (
        <div className="space-y-6">
            {/* Search */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Search className="w-5 h-5" />
                    Search Generations
                </h3>
                <div className="flex gap-4">
                    <select
                        value={search.column}
                        onChange={(e) => setSearch({ ...search, column: e.target.value })}
                        className="px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 outline-none"
                    >
                        <option value="email">Email</option>
                        <option value="userId">User ID</option>
                        <option value="unlocked">Unlocked (true/false)</option>
                        <option value="ip">IP Address</option>
                        <option value="country">Country</option>
                    </select>
                    <input
                        type="text"
                        value={search.value}
                        onChange={(e) => setSearch({ ...search, value: e.target.value })}
                        placeholder="Search value..."
                        className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                    <button
                        onClick={handleSearch}
                        className="px-6 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700"
                    >
                        Search
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-semibold text-gray-700">User</th>
                                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Type</th>
                                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
                                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Images</th>
                                        <th className="px-4 py-3 text-left font-semibold text-gray-700">IP</th>
                                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {generations.map((gen) => (
                                        <tr key={gen.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 text-gray-900">{gen.user?.email || "Guest"}</td>
                                            <td className="px-4 py-3">
                                                <span className={cn(
                                                    "px-2 py-1 rounded-full text-xs font-medium",
                                                    gen.user?.userType === "BUSINESS" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"
                                                )}>
                                                    {gen.user?.userType || "Guest"}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={cn(
                                                    "px-2 py-1 rounded-full text-xs font-medium",
                                                    gen.unlocked ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                                                )}>
                                                    {gen.unlocked ? "Unlocked" : "Locked"}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex gap-1">
                                                    {gen.originalUrl && <ImagePreview url={gen.originalUrl} label="O" />}
                                                    {gen.basicUrl && <ImagePreview url={gen.basicUrl} label="B" />}
                                                    {gen.advancedUrl && <ImagePreview url={gen.advancedUrl} label="A" />}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-gray-600 text-xs">{gen.ip || "N/A"}</td>
                                            <td className="px-4 py-3 text-gray-600 text-xs">
                                                {new Date(gen.createdAt).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {/* Pagination */}
                        {pagination && (
                            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                                <div className="text-sm text-gray-600">
                                    Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                        className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium disabled:opacity-50"
                                    >
                                        Previous
                                    </button>
                                    <button
                                        onClick={() => setPage(p => p + 1)}
                                        disabled={page >= pagination.totalPages}
                                        className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium disabled:opacity-50"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

function ImagePreview({ url, label }: { url: string; label: string }) {
    return (
        <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-8 h-8 rounded border border-gray-300 overflow-hidden relative group"
            title={`View ${label}`}
        >
            <Image src={url} alt={label} fill className="object-cover" />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition-opacity">
                {label}
            </div>
        </a>
    );
}

function BillingTab() {
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState({ column: "email", value: "" });
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState<any>(null);
    const [freePromotion, setFreePromotion] = useState(false);
    const [promotionLoading, setPromotionLoading] = useState(false);

    useEffect(() => {
        fetchTransactions();
        fetchPromotionStatus();
    }, [page]);

    const fetchPromotionStatus = async () => {
        try {
            const res = await fetch('/api/admin/promotion');
            const data = await res.json();
            setFreePromotion(data.freeUnlockMode || false);
        } catch (e) {
            console.error('Failed to fetch promotion status:', e);
        }
    };

    const togglePromotion = async () => {
        setPromotionLoading(true);
        try {
            const res = await fetch('/api/admin/promotion', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    freeUnlockMode: !freePromotion,
                    adminId: 'admin'
                })
            });
            const data = await res.json();
            if (data.success) {
                setFreePromotion(data.freeUnlockMode);
                alert(`Free Promotion ${data.freeUnlockMode ? 'ENABLED' : 'DISABLED'}! Users can now ${data.freeUnlockMode ? 'unlock images for free' : 'only unlock with credits'}.`);
            }
        } catch (e) {
            console.error('Failed to toggle promotion:', e);
            alert('Failed to toggle promotion mode');
        } finally {
            setPromotionLoading(false);
        }
    };

    const fetchTransactions = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: "50"
            });
            if (search.value) {
                params.append("search", search.column);
                params.append("value", search.value);
            }
            const res = await fetch(`/api/admin/billing?${params}`);
            const data = await res.json();
            setTransactions(data.transactions || []);
            setPagination(data.pagination);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = () => {
        setPage(1);
        fetchTransactions();
    };

    return (
        <div className="space-y-6">
            {/* Free Promotion Toggle */}
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-6 rounded-2xl border-2 border-purple-200">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
                            🎁 Free Promotion Mode
                        </h3>
                        <p className="text-sm text-gray-600">
                            {freePromotion
                                ? "Users can unlock images for FREE (adds +1 credit, then uses -1 credit)"
                                : "Users need credits to unlock images (normal mode)"}
                        </p>
                    </div>
                    <button
                        onClick={togglePromotion}
                        disabled={promotionLoading}
                        className={cn(
                            "relative inline-flex h-8 w-14 items-center rounded-full transition-colors",
                            freePromotion ? "bg-green-500" : "bg-gray-300",
                            promotionLoading && "opacity-50 cursor-not-allowed"
                        )}
                    >
                        <span
                            className={cn(
                                "inline-block h-6 w-6 transform rounded-full bg-white transition-transform",
                                freePromotion ? "translate-x-7" : "translate-x-1"
                            )}
                        />
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Search className="w-5 h-5" />
                    Search Transactions
                </h3>
                <div className="flex gap-4">
                    <select
                        value={search.column}
                        onChange={(e) => setSearch({ ...search, column: e.target.value })}
                        className="px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 outline-none"
                    >
                        <option value="email">Email</option>
                        <option value="userId">User ID</option>
                        <option value="transactionType">Type</option>
                    </select>
                    <input
                        type="text"
                        value={search.value}
                        onChange={(e) => setSearch({ ...search, value: e.target.value })}
                        placeholder="Search value..."
                        className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                    <button
                        onClick={handleSearch}
                        className="px-6 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700"
                    >
                        Search
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-semibold text-gray-700">User</th>
                                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Type</th>
                                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Transaction</th>
                                        <th className="px-4 py-3 text-right font-semibold text-gray-700">Amount</th>
                                        <th className="px-4 py-3 text-right font-semibold text-gray-700">Credits</th>
                                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Expires</th>
                                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {transactions.map((tx) => (
                                        <tr key={tx.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 text-gray-900">{tx.user?.email || "N/A"}</td>
                                            <td className="px-4 py-3">
                                                <span className={cn(
                                                    "px-2 py-1 rounded-full text-xs font-medium",
                                                    tx.user?.userType === "BUSINESS" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"
                                                )}>
                                                    {tx.user?.userType || "N/A"}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={cn(
                                                    "px-2 py-1 rounded-full text-xs font-medium",
                                                    tx.transactionType === "PURCHASE" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                                )}>
                                                    {tx.transactionType}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right text-gray-900">
                                                {tx.amountPaid ? `$${Number(tx.amountPaid).toFixed(2)}` : "-"}
                                            </td>
                                            <td className={cn(
                                                "px-4 py-3 text-right font-bold",
                                                tx.creditsChange > 0 ? "text-green-600" : "text-red-600"
                                            )}>
                                                {tx.creditsChange > 0 ? "+" : ""}{tx.creditsChange}
                                            </td>
                                            <td className="px-4 py-3 text-gray-600 text-xs">
                                                {tx.expiresAt ? new Date(tx.expiresAt).toLocaleDateString() : "-"}
                                            </td>
                                            <td className="px-4 py-3 text-gray-600 text-xs">
                                                {new Date(tx.createdAt).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {/* Pagination */}
                        {pagination && (
                            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                                <div className="text-sm text-gray-600">
                                    Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                        className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium disabled:opacity-50"
                                    >
                                        Previous
                                    </button>
                                    <button
                                        onClick={() => setPage(p => p + 1)}
                                        disabled={page >= pagination.totalPages}
                                        className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium disabled:opacity-50"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

function UsersTab() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState({ column: "email", value: "" });
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState<any>(null);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [editForm, setEditForm] = useState<any>({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, [page]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: "50"
            });
            if (search.value) {
                params.append("search", search.column);
                params.append("value", search.value);
            }
            const res = await fetch(`/api/admin/users?${params}`);
            const data = await res.json();
            setUsers(data.users || []);
            setPagination(data.pagination);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = () => {
        setPage(1);
        fetchUsers();
    };

    const openEditModal = async (user: any) => {
        setSelectedUser(user);
        setEditForm({
            credits: user.credits,
            creditExpiresAt: user.creditExpiresAt ? new Date(user.creditExpiresAt).toISOString().split('T')[0] : '',
            userType: user.userType,
            businessName: user.businessName || '',
            phoneNumber: user.phoneNumber || ''
        });
    };

    const closeEditModal = () => {
        setSelectedUser(null);
        setEditForm({});
    };

    const saveUser = async () => {
        if (!selectedUser) return;

        setSaving(true);
        try {
            const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editForm)
            });

            const data = await res.json();
            if (data.success) {
                alert('User updated successfully!');
                closeEditModal();
                fetchUsers(); // Refresh list
            } else {
                alert('Failed to update user');
            }
        } catch (e) {
            console.error(e);
            alert('Error updating user');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Edit Modal */}
            {selectedUser && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">Edit User: {selectedUser.email}</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Credits</label>
                                <input
                                    type="number"
                                    value={editForm.credits}
                                    onChange={(e) => setEditForm({ ...editForm, credits: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Credit Expiration Date</label>
                                <input
                                    type="date"
                                    value={editForm.creditExpiresAt}
                                    onChange={(e) => setEditForm({ ...editForm, creditExpiresAt: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">User Type</label>
                                <select
                                    value={editForm.userType}
                                    onChange={(e) => setEditForm({ ...editForm, userType: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 outline-none"
                                >
                                    <option value="INDIVIDUAL">INDIVIDUAL</option>
                                    <option value="BUSINESS">BUSINESS</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
                                <input
                                    type="text"
                                    value={editForm.businessName}
                                    onChange={(e) => setEditForm({ ...editForm, businessName: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                                <input
                                    type="text"
                                    value={editForm.phoneNumber}
                                    onChange={(e) => setEditForm({ ...editForm, phoneNumber: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 outline-none"
                                />
                            </div>
                        </div>

                        <div className="flex gap-4 mt-8">
                            <button
                                onClick={saveUser}
                                disabled={saving}
                                className="flex-1 bg-purple-600 text-white py-3 rounded-xl font-bold hover:bg-purple-700 disabled:opacity-50"
                            >
                                {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                            <button
                                onClick={closeEditModal}
                                disabled={saving}
                                className="flex-1 bg-gray-200 text-gray-900 py-3 rounded-xl font-bold hover:bg-gray-300 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Search */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Search className="w-5 h-5" />
                    Search Users
                </h3>
                <div className="flex gap-4">
                    <select
                        value={search.column}
                        onChange={(e) => setSearch({ ...search, column: e.target.value })}
                        className="px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 outline-none"
                    >
                        <option value="email">Email</option>
                        <option value="userType">User Type</option>
                        <option value="businessName">Business Name</option>
                    </select>
                    <input
                        type="text"
                        value={search.value}
                        onChange={(e) => setSearch({ ...search, value: e.target.value })}
                        placeholder="Search value..."
                        className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                    <button
                        onClick={handleSearch}
                        className="px-6 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700"
                    >
                        Search
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Email</th>
                                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Type</th>
                                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Business</th>
                                        <th className="px-4 py-3 text-right font-semibold text-gray-700">Credits</th>
                                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Expires</th>
                                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Joined</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {users.map((user) => (
                                        <tr
                                            key={user.id}
                                            onClick={() => openEditModal(user)}
                                            className="hover:bg-purple-50 cursor-pointer transition-colors"
                                        >
                                            <td className="px-4 py-3 text-gray-900">{user.email}</td>
                                            <td className="px-4 py-3">
                                                <span className={cn(
                                                    "px-2 py-1 rounded-full text-xs font-medium",
                                                    user.userType === "BUSINESS" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"
                                                )}>
                                                    {user.userType}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-gray-600">{user.businessName || "-"}</td>
                                            <td className="px-4 py-3 text-right font-bold text-purple-600">{user.credits}</td>
                                            <td className="px-4 py-3 text-gray-600 text-xs">
                                                {user.creditExpiresAt ? new Date(user.creditExpiresAt).toLocaleDateString() : "-"}
                                            </td>
                                            <td className="px-4 py-3 text-gray-600 text-xs">
                                                {new Date(user.createdAt).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {/* Pagination */}
                        {pagination && (
                            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                                <div className="text-sm text-gray-600">
                                    Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                        className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium disabled:opacity-50"
                                    >
                                        Previous
                                    </button>
                                    <button
                                        onClick={() => setPage(p => p + 1)}
                                        disabled={page >= pagination.totalPages}
                                        className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium disabled:opacity-50"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
