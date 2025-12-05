'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Package, 
  User, 
  Settings, 
  LogOut, 
  HelpCircle, 
  Bell,
  ChevronDown,
  Wallet
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function DashboardHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/90 backdrop-blur-md">
      <div className="container mx-auto px-4 lg:px-8 h-20 flex items-center justify-between">
        {/* Logo & Brand */}
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-600/20">
            <Package className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold text-slate-900 tracking-tight">JuraganSuplai</span>
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Wallet Balance */}
          <div className="hidden md:flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-full px-4 py-2">
            <Wallet className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-medium text-emerald-700">Rp 2.450.000</span>
          </div>

          {/* Notifications */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="relative text-slate-600 hover:bg-slate-100 rounded-full w-10 h-10"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center">
              3
            </span>
          </Button>

          {/* User Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className="flex items-center gap-2 hover:bg-slate-100 rounded-full pl-1.5 pr-3 py-1.5 h-auto"
              >
                <Avatar className="h-9 w-9 border-2 border-emerald-200">
                  <AvatarImage src="/avatars/buyer.png" alt="User" />
                  <AvatarFallback className="bg-emerald-100 text-emerald-600 font-semibold text-sm">
                    DB
                  </AvatarFallback>
                </Avatar>
                <span className="hidden sm:block text-sm font-medium text-slate-700">Demo</span>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </Button>
            </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64 mt-2" align="end" forceMount>
                <DropdownMenuLabel className="font-normal px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src="/avatars/buyer.png" alt="User" />
                      <AvatarFallback className="bg-emerald-100 text-emerald-600 font-semibold">
                        DB
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <p className="text-sm font-semibold text-slate-900">Demo Buyer</p>
                      <p className="text-xs text-slate-500">buyer@juragansuplai.com</p>
                      <Badge variant="secondary" className="w-fit mt-1 text-[10px] bg-emerald-50 text-emerald-700">
                        Verified Buyer
                      </Badge>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="p-2">
                  <DropdownMenuItem className="rounded-lg cursor-pointer">
                    <User className="mr-3 h-4 w-4 text-slate-500" />
                    <span>Profil Saya</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="rounded-lg cursor-pointer">
                    <Wallet className="mr-3 h-4 w-4 text-slate-500" />
                    <div className="flex items-center justify-between flex-1">
                      <span>Dompet</span>
                      <span className="text-xs font-medium text-emerald-600">Rp 2.4jt</span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="rounded-lg cursor-pointer">
                    <Settings className="mr-3 h-4 w-4 text-slate-500" />
                    <span>Pengaturan</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="rounded-lg cursor-pointer">
                    <HelpCircle className="mr-3 h-4 w-4 text-slate-500" />
                    <span>Pusat Bantuan</span>
                  </DropdownMenuItem>
                </div>
                <DropdownMenuSeparator />
                <div className="p-2">
                  <DropdownMenuItem className="rounded-lg cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50">
                    <LogOut className="mr-3 h-4 w-4" />
                    <span>Keluar</span>
                  </DropdownMenuItem>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
    </header>
  );
}
