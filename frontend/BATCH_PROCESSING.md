# Batch Processing Script

This script allows you to process multiple applicants from a CSV file, supporting LinkedIn profiles, GitHub accounts, and optional CV files.

## Usage

```bash
npm run batch-process <csv-file>
```

## CSV Format

The CSV file should have the following columns (all optional except at least one of `linkedin` or `cv`):

- `name`: Applicant's full name (optional - will be extracted from other sources)
- `email`: Applicant's email address (optional - will be extracted from other sources)
- `linkedin`: LinkedIn profile URL or path to downloaded profile file (PDF, HTML, or TXT)
- `github`: GitHub profile URL (e.g., https://github.com/username) - optional
- `cv`: Path to CV file (PDF, DOC, or DOCX)

### Example CSV:

```csv
name,email,linkedin,github,cv
John Doe,john@example.com,https://linkedin.com/in/johndoe,https://github.com/johndoe,
Jane Smith,jane@example.com,jane-linkedin-profile.pdf,https://github.com/janesmith,
Bob Johnson,,https://linkedin.com/in/bobjohnson,https://github.com/bobjohnson,
Alice Brown,alice@example.com,,,/path/to/alice-cv.pdf
Charlie Wilson,,https://linkedin.com/in/charliewilson,,
```

## Requirements

- At least one of `linkedin` or `cv` must be provided for each row
- LinkedIn can be:
  - A URL to the LinkedIn profile
  - A file path to a downloaded LinkedIn profile (PDF, HTML, or TXT)
- GitHub must be a valid GitHub profile URL
- CV files must be accessible file paths (PDF, DOC, or DOCX)

## Features

- **Parallel Processing**: Processes CV, LinkedIn, and GitHub data simultaneously
- **Error Handling**: Continues processing even if individual sources fail
- **Progress Tracking**: Shows real-time progress and detailed logging
- **Data Extraction**: Automatically extracts name, email, and other details from available sources
- **Analysis**: Performs comprehensive credibility analysis on all processed data
- **Fallback Data**: Uses GitHub username or CSV name if other sources don't provide names

## Output

The script will:
1. Create applicant records in the system
2. Process all available data sources
3. Perform credibility analysis
4. Show a summary of successful and failed processing attempts

## Error Handling

If processing fails for any applicant, the script will:
- Log the specific error
- Continue processing remaining applicants
- Provide a summary of all failures at the end

## Example Usage

```bash
# Process applicants from CSV
npm run batch-process example-applicants.csv

# Process with absolute path
npm run batch-process /path/to/your/applicants.csv
```

## Notes

- File paths in the CSV should be absolute paths or relative to the script execution directory
- LinkedIn profile files can be downloaded from LinkedIn's "Save to PDF" feature
- GitHub URLs should be in the format: https://github.com/username
- The script uses the same processing pipeline as the web interface
- All processed applicants will appear in the main application interface