'use client';

import { useState, useRef } from 'react';
import { AppLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, Button } from '@/components/ui';
import {
  Upload,
  FileText,
  Search,
  Download,
  Trash2,
  Eye,
  Calendar,
  HardDrive,
} from 'lucide-react';
import { formatDate, formatFileSize } from '@/lib/utils';

const reports = [
  {
    id: '1',
    fileName: '2018_Honda_Accord_Full_Diagnostic.pdf',
    fileSize: 2456000,
    uploadedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    description: 'Complete engine and transmission diagnostic report',
  },
  {
    id: '2',
    fileName: 'Ford_F150_ABS_Scan.pdf',
    fileSize: 1234000,
    uploadedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    description: 'ABS module scan results',
  },
  {
    id: '3',
    fileName: 'Toyota_Camry_Emissions_Test.pdf',
    fileSize: 890000,
    uploadedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    description: 'State emissions test results',
  },
  {
    id: '4',
    fileName: 'Chevrolet_Silverado_ECM_Data.pdf',
    fileSize: 3120000,
    uploadedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    description: 'ECM freeze frame data and live readings',
  },
];

export default function ReportsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredReports = reports.filter((report) =>
    report.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    report.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalSize = reports.reduce((acc, report) => acc + report.fileSize, 0);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    // Handle file upload
    const files = e.dataTransfer.files;
    console.log('Dropped files:', files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    console.log('Selected files:', files);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Upload Area */}
        <Card>
          <CardContent className="p-6">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                isDragging
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Upload diagnostic reports
              </h3>
              <p className="text-gray-500 mb-4">
                Drag and drop PDF files here, or click to browse
              </p>
              <Button onClick={() => fileInputRef.current?.click()}>
                Select Files
              </Button>
              <p className="text-xs text-gray-400 mt-4">
                PDF files only • Unlimited uploads • Stored indefinitely
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{reports.length}</p>
                <p className="text-sm text-gray-500">Total Reports</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <HardDrive className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{formatFileSize(totalSize)}</p>
                <p className="text-sm text-gray-500">Total Storage</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Calendar className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {formatDate(reports[0]?.uploadedAt || new Date())}
                </p>
                <p className="text-sm text-gray-500">Last Upload</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Reports List */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Your Reports</h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search reports..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100">
              {filteredReports.map((report) => (
                <div
                  key={report.id}
                  className="flex items-center gap-4 p-4 hover:bg-gray-50"
                >
                  <div className="p-3 bg-red-100 rounded-lg">
                    <FileText className="w-6 h-6 text-red-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 truncate">
                      {report.fileName}
                    </h4>
                    <p className="text-sm text-gray-500 truncate">
                      {report.description}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                      <span>{formatFileSize(report.fileSize)}</span>
                      <span>•</span>
                      <span>{formatDate(report.uploadedAt)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                      <Eye className="w-5 h-5" />
                    </button>
                    <button className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg">
                      <Download className="w-5 h-5" />
                    </button>
                    <button className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
