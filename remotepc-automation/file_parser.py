"""
Intelligent file parser for diagnostic data
Handles multiple formats: PDF, XML, JSON, DB, CSV
"""
import re
import json
import sqlite3
import PyPDF2
import pandas as pd
from pathlib import Path
from typing import Optional, Dict, List
from datetime import datetime


class DiagnosticFileParser:
    """
    Smart parser that detects file type and extracts diagnostic data
    """

    def __init__(self):
        self.dtc_pattern = re.compile(r'([PCBU][0-9A-F]{4})')  # DTC code pattern
        self.vin_pattern = re.compile(r'\b[A-HJ-NPR-Z0-9]{17}\b')  # VIN pattern

    def parse(self, file_path: Path) -> Optional[Dict]:
        """
        Parse a diagnostic file and extract vehicle/DTC data

        Args:
            file_path: Path to diagnostic file

        Returns:
            dict with extracted data or None if unable to parse
        """
        file_ext = file_path.suffix.lower()

        parsers = {
            '.pdf': self._parse_pdf,
            '.xml': self._parse_xml,
            '.json': self._parse_json,
            '.db': self._parse_database,
            '.sqlite': self._parse_database,
            '.mdb': self._parse_access_db,
            '.csv': self._parse_csv,
            '.txt': self._parse_text,
        }

        parser_func = parsers.get(file_ext)

        if parser_func:
            try:
                data = parser_func(file_path)
                if data:
                    # Add metadata
                    data['source_file'] = str(file_path.name)
                    data['imported_at'] = datetime.now().isoformat()
                    return data
            except Exception as e:
                print(f"Error parsing {file_path}: {str(e)}")

        return None

    def _parse_pdf(self, file_path: Path) -> Optional[Dict]:
        """
        Extract data from PDF diagnostic reports
        """
        try:
            with open(file_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                text = ""

                # Extract text from all pages
                for page in pdf_reader.pages:
                    text += page.extract_text()

            return self._extract_from_text(text)

        except Exception as e:
            print(f"PDF parse error: {str(e)}")
            return None

    def _parse_xml(self, file_path: Path) -> Optional[Dict]:
        """
        Parse XML diagnostic files (common in newer tools)
        """
        import xml.etree.ElementTree as ET

        try:
            tree = ET.parse(file_path)
            root = tree.getroot()

            data = {
                'vin': None,
                'dtc_codes': [],
                'vehicle_info': {},
                'diagnostic_data': {}
            }

            # Look for common XML structures
            # VIN
            vin_elem = root.find('.//VIN') or root.find('.//vin') or root.find('.//VehicleIdentificationNumber')
            if vin_elem is not None and vin_elem.text:
                data['vin'] = vin_elem.text.strip()

            # DTCs
            for dtc_elem in root.findall('.//DTC') + root.findall('.//Code') + root.findall('.//TroubleCode'):
                code = dtc_elem.get('code') or dtc_elem.text
                description = dtc_elem.get('description') or dtc_elem.find('Description')

                if code:
                    data['dtc_codes'].append({
                        'code': code.strip(),
                        'description': description.text.strip() if hasattr(description, 'text') else str(description) if description else None
                    })

            # Vehicle info
            make_elem = root.find('.//Make') or root.find('.//make')
            model_elem = root.find('.//Model') or root.find('.//model')
            year_elem = root.find('.//Year') or root.find('.//year')

            if make_elem is not None:
                data['vehicle_info']['make'] = make_elem.text
            if model_elem is not None:
                data['vehicle_info']['model'] = model_elem.text
            if year_elem is not None:
                data['vehicle_info']['year'] = year_elem.text

            return data if (data['vin'] or data['dtc_codes']) else None

        except Exception as e:
            print(f"XML parse error: {str(e)}")
            return None

    def _parse_json(self, file_path: Path) -> Optional[Dict]:
        """
        Parse JSON diagnostic files
        """
        try:
            with open(file_path, 'r', encoding='utf-8') as file:
                data = json.load(file)

            # Normalize structure (different tools have different formats)
            normalized = {
                'vin': None,
                'dtc_codes': [],
                'vehicle_info': {},
                'diagnostic_data': data
            }

            # Try to find VIN in common locations
            vin = (data.get('vin') or data.get('VIN') or
                   data.get('vehicle', {}).get('vin') or
                   data.get('vehicleInfo', {}).get('vin'))

            if vin:
                normalized['vin'] = vin

            # Try to find DTCs
            dtcs = (data.get('dtc_codes') or data.get('codes') or
                    data.get('trouble_codes') or data.get('DTCs') or
                    data.get('diagnostic', {}).get('codes') or [])

            if isinstance(dtcs, list):
                normalized['dtc_codes'] = dtcs
            elif isinstance(dtcs, dict):
                normalized['dtc_codes'] = [{'code': k, 'description': v} for k, v in dtcs.items()]

            # Vehicle info
            vehicle_info = data.get('vehicle') or data.get('vehicleInfo') or {}
            normalized['vehicle_info'] = {
                'make': vehicle_info.get('make'),
                'model': vehicle_info.get('model'),
                'year': vehicle_info.get('year')
            }

            return normalized if (normalized['vin'] or normalized['dtc_codes']) else None

        except Exception as e:
            print(f"JSON parse error: {str(e)}")
            return None

    def _parse_database(self, file_path: Path) -> Optional[Dict]:
        """
        Parse SQLite database files
        Common in Snap-on and other professional tools
        """
        try:
            conn = sqlite3.connect(file_path)
            cursor = conn.cursor()

            # Get table names
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
            tables = [row[0] for row in cursor.fetchall()]

            data = {
                'vin': None,
                'dtc_codes': [],
                'vehicle_info': {},
                'diagnostic_data': {}
            }

            # Look for common table names
            for table in tables:
                table_lower = table.lower()

                # VIN table
                if 'vin' in table_lower or 'vehicle' in table_lower:
                    cursor.execute(f"SELECT * FROM {table} LIMIT 100")
                    columns = [desc[0] for desc in cursor.description]
                    rows = cursor.fetchall()

                    for row in rows:
                        row_dict = dict(zip(columns, row))
                        # Look for VIN column
                        for col in columns:
                            if 'vin' in col.lower():
                                potential_vin = row_dict[col]
                                if potential_vin and self.vin_pattern.match(str(potential_vin)):
                                    data['vin'] = potential_vin
                                    break

                # DTC table
                if 'dtc' in table_lower or 'code' in table_lower or 'trouble' in table_lower:
                    cursor.execute(f"SELECT * FROM {table} LIMIT 500")
                    columns = [desc[0] for desc in cursor.description]
                    rows = cursor.fetchall()

                    for row in rows:
                        row_dict = dict(zip(columns, row))
                        # Find code and description columns
                        code = None
                        description = None

                        for col in columns:
                            col_lower = col.lower()
                            if 'code' in col_lower and not description:
                                code = row_dict[col]
                            elif 'desc' in col_lower or 'definition' in col_lower:
                                description = row_dict[col]

                        if code:
                            data['dtc_codes'].append({
                                'code': str(code),
                                'description': str(description) if description else None
                            })

            conn.close()

            return data if (data['vin'] or data['dtc_codes']) else None

        except Exception as e:
            print(f"Database parse error: {str(e)}")
            return None

    def _parse_access_db(self, file_path: Path) -> Optional[Dict]:
        """
        Parse Microsoft Access database files
        Requires pyodbc and Access Database Engine
        """
        # For now, return None - Access DB support requires additional setup
        print(f"Access DB parsing not yet implemented: {file_path}")
        return None

    def _parse_csv(self, file_path: Path) -> Optional[Dict]:
        """
        Parse CSV files with diagnostic data
        """
        try:
            df = pd.read_csv(file_path)

            data = {
                'vin': None,
                'dtc_codes': [],
                'vehicle_info': {},
                'diagnostic_data': {}
            }

            # Look for VIN column
            vin_columns = [col for col in df.columns if 'vin' in col.lower()]
            if vin_columns:
                potential_vins = df[vin_columns[0]].dropna().unique()
                for vin in potential_vins:
                    if self.vin_pattern.match(str(vin)):
                        data['vin'] = str(vin)
                        break

            # Look for DTC columns
            code_columns = [col for col in df.columns if any(keyword in col.lower()
                            for keyword in ['dtc', 'code', 'trouble'])]

            if code_columns:
                for _, row in df.iterrows():
                    code = row.get(code_columns[0])
                    if code and pd.notna(code):
                        # Look for description column
                        desc_col = [col for col in df.columns if 'desc' in col.lower()]
                        description = row.get(desc_col[0]) if desc_col else None

                        data['dtc_codes'].append({
                            'code': str(code),
                            'description': str(description) if pd.notna(description) else None
                        })

            return data if (data['vin'] or data['dtc_codes']) else None

        except Exception as e:
            print(f"CSV parse error: {str(e)}")
            return None

    def _parse_text(self, file_path: Path) -> Optional[Dict]:
        """
        Parse plain text diagnostic files
        """
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as file:
                text = file.read()

            return self._extract_from_text(text)

        except Exception as e:
            print(f"Text parse error: {str(e)}")
            return None

    def _extract_from_text(self, text: str) -> Optional[Dict]:
        """
        Extract diagnostic data from plain text using regex
        Works for PDF text extraction and plain text files
        """
        data = {
            'vin': None,
            'dtc_codes': [],
            'vehicle_info': {},
            'diagnostic_data': {'raw_text': text[:1000]}  # First 1000 chars
        }

        # Extract VIN
        vin_matches = self.vin_pattern.findall(text)
        if vin_matches:
            data['vin'] = vin_matches[0]

        # Extract DTCs
        dtc_matches = self.dtc_pattern.findall(text)
        if dtc_matches:
            # Remove duplicates while preserving order
            unique_dtcs = []
            seen = set()
            for dtc in dtc_matches:
                if dtc not in seen:
                    unique_dtcs.append(dtc)
                    seen.add(dtc)

            # Try to extract descriptions
            for dtc in unique_dtcs:
                # Look for text after the DTC code (likely description)
                pattern = f"{dtc}[:\\s-]*([^\n\r{{0-9}}]*)"
                desc_match = re.search(pattern, text)
                description = desc_match.group(1).strip() if desc_match else None

                data['dtc_codes'].append({
                    'code': dtc,
                    'description': description
                })

        # Extract vehicle make/model/year
        # Look for common patterns
        year_pattern = r'(?:Year|MODEL YEAR)[:\s]*(\d{4})'
        make_pattern = r'(?:Make|MAKE)[:\s]*([A-Z][a-zA-Z]+)'
        model_pattern = r'(?:Model|MODEL)[:\s]*([A-Z][a-zA-Z0-9\s]+)'

        year_match = re.search(year_pattern, text, re.IGNORECASE)
        make_match = re.search(make_pattern, text)
        model_match = re.search(model_pattern, text)

        if year_match:
            data['vehicle_info']['year'] = year_match.group(1)
        if make_match:
            data['vehicle_info']['make'] = make_match.group(1).strip()
        if model_match:
            data['vehicle_info']['model'] = model_match.group(1).strip()

        return data if (data['vin'] or data['dtc_codes']) else None


if __name__ == "__main__":
    # Test parser
    parser = DiagnosticFileParser()

    # Test with sample text
    sample_text = """
    VIN: 1HGBH41JXMN109186
    Year: 2021
    Make: Honda
    Model: Civic

    Diagnostic Trouble Codes:
    P0420 - Catalyst System Efficiency Below Threshold
    P0301 - Cylinder 1 Misfire Detected
    """

    result = parser._extract_from_text(sample_text)
    print(json.dumps(result, indent=2))
