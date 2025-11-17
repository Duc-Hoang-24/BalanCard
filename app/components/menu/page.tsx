'use client'
import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type MenuItem = {
    label: string;
    href?: string;
    icon?: string;
    children?: {label: string; href: string}[];
};

const menuItems: MenuItem[] = [
    {label: "Home", href: "/", icon: "🏠"},

    {label: "Library", href: "/components/library", icon: "📚"},

    {label: "Flashcard", href: "/components/flashcard", icon: "🗂️"},

    {label: "Study", href: "/components/study", icon: "📖"}
];
export default function Sidebar() {
    const [isExpanded, setIsExpanded] = useState<boolean>(false);
    const [openMenu, setOpenMenu] = useState<string | null>(null);
    const pathname = usePathname();

return (
    <div className="flex h-screen">
        {/* side bar */}
        <aside className={`fixed top-45 left-0 bg-cyan-700 text-purple-700 shadow-lg transition-all duration-300 ease-in-out rounded-r-xl ${isExpanded ? 'w-30 h-40 lg:w-42 lg:h-80': 'w-7 h-40 lg:w-16 lg:h-80'}`}>
        {/* Hamburger button */}
        <div className="p-1 lg:p-4 border-b-2 w-full border-purple-800">
            <button
                onClick={() => {
                    setIsExpanded(!isExpanded);
                    if (!isExpanded) setOpenMenu(null); }} // Close any open menus when collapsing
                    
                className="bg-blue-200 w-full flex items-center justify-center p-2 text-purple-500 hover:bg-blue-300 transition-all duration-200 ease-in-out rounded-md " aria-label="Toggle sidebar"
                >
                    <svg className="w-2 h-2 lg:w-6 lg:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/>
                    </svg>
                </button>
        </div>
        {/* Navigation - only show when expanded */}
        {isExpanded && (
            <nav className="mt-0 lg:mt-6">
                <ul className="space-y-0 lg:space-y-2 px-2 transition-all">
                    {menuItems.map((item) => (
                        <li key={item.label} className="relative">
                            {item.children ? (
                        <> 
                        <button 
                        onClick={() => 
                        setOpenMenu(openMenu === item.label ? null : item.label)}
                        className='w-full flex items-center justify-between px-1 py-0 lg:px-4 lg:py-3 rounded-lg transition-all duration-200 font-bold hover:bg-blue-300'>
                        <div className="flex items-center">
                            {item.icon && <span className="flex-shrink-0 text-lg lg:text-xl">{item.icon}</span>}
                            <span className="text-md lg:text-xl">{item.label}</span>
                        </div>
                        </button>
                    {/* Dropdown menu */}
                    <div className={`overflow-hidden transition-all duration-300 ease-in-out ${openMenu === item.label ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                        <ul className="ml-0 lg:ml-4 mt-2 space-y-1">
                            {item.children.map((child) => (
                                <li key={child.label}>
                                <Link
                                href={child.href} 
                                className={`block px-4 py-2 rounded-lg transition-all duration-300 ease-in-out ${pathname === child.href ? 'bg-blue-600 text-white font-semibold' : 'text-purple-500 hover:bg-blue-300'
                                }
                                `}
                                >
                                    {child.label}
                                </Link>
                                </li>))}
                        </ul>
                    </div>
                    </> 
                    ) : (
                    
                    <Link 
                    href={item.href!} 
                    className={`flex items-center px-0 py-0 lg:px-2 lg:py-2 rounded-lg transition-all duration-300 ease-in-out font-bold ${pathname === item.href ? 'bg-blue-400 text-purple-500 border-l-2 lg:border-l-4 border-t-4 border-blue-700' : 'text-purple-300 hover:bg-blue-200 hover:border-2 hover:border-purple-500 hover:text-purple-500'
                        }
                    `}
                    onClick={() => setIsExpanded(false)}
                    >
                        {item.icon && <span className="mr-1 lg:mr-3 text-lg lg:text-xl">{item.icon}</span>}
                        <span className={`${pathname === item.href ? 'underline underline-offset-4 decoration-2 decoration-dashed':''}`}>{item.label}</span>
                    </Link>
                    )}
                    </li>
                ))}
                </ul>
            </nav>
        )}
        {/* Collapsed state - show only icons/indicators */}
        {!isExpanded && (
            <div className="mt-1 lg:mt-5 px-0 lg:px-2 flex flex-col space-y-1 lg:space-y-6 transition">
                {menuItems.map((item) => (
             <li key={item.label}>
                <Link
                href={item.href!}
                // onClick={() => setIsExpanded(true)}
                className={`
                    w-full p-0.5 lg:p-2 rounded-lg transition-all duration-300 ease-in-out text-center hover:bg-blue-500
                    ${item.href && pathname === item.href
                    ? ' bg-blue-300 text-white'
                    : 'text-purple-500'
                    }
                `}
                title={item.label}
                >
                <span className="text-md lg:text-2xl ml-0">{item.icon}</span>
                </Link>
            </li>
        ))}
        </div>
        )}
        </aside>
    </div>
);
}