'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  MessageCircle, 
  Phone, 
  FileText, 
  ChevronRight,
  HeadphonesIcon
} from 'lucide-react';

export function QuickHelpCard() {
  return (
    <div className="mt-4">
      {/* Help Center */}
      <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-0 overflow-hidden">
        <div className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <HeadphonesIcon className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Butuh Bantuan?</h3>
              <p className="text-xs text-slate-400">Tim support kami siap membantu</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="bg-white/10 border-white/20 text-white hover:bg-white/20 justify-start"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Chat
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="bg-white/10 border-white/20 text-white hover:bg-white/20 justify-start"
            >
              <Phone className="w-4 h-4 mr-2" />
              Telepon
            </Button>
          </div>
          
          <Button 
            variant="link" 
            className="w-full mt-3 text-emerald-400 hover:text-emerald-300 p-0 h-auto justify-between"
          >
            <span className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Lihat Panduan Lengkap
            </span>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
}
