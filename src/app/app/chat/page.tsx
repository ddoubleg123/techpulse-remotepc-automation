'use client';
import { useState, useRef, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { isDemoUser } from '@/lib/demoUsers';
import { assertAcceptableScannerPdf, getPdfSizeViolationMessage, readPdfAsRawBase64 } from '@/lib/scannerPdf';
import { getOrCreateSessionUnid } from '@/lib/unid';
import { useSearchParams } from 'next/navigation';
import { loadSession } from '@/lib/sessionHistory';
import { isValidPdfBase64 } from '@/lib/upload-classifier';
import { ConfirmFixModal } from '@/components/billing/ConfirmFixModal';
import { UnconfirmFixModal } from '@/components/billing/UnconfirmFixModal';
import {
  Send, Zap, Plus, X, ChevronRight, ChevronLeft,
  CheckCircle, AlertTriangle, FileText, ThumbsUp, ThumbsDown,
  RotateCcw, Upload, Search, Car, Info
} from 'lucide-react';

const SYNTH_API = 'https://techpulse-api.onrender.com';
const API_TOKEN = process.env.NEXT_PUBLIC_SYNTH_API_TOKEN || '';

type Step = 'vin' | 'codes' | 'chat' | 'report' | 'feedback';
interface Vehicle { year: string; make: string; model: string; engine: string; mileage: string; vin: string; }
interface DtcCode { code: string; description: string; }