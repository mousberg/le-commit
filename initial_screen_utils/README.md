# CV Processing Backend

This backend provides TypeScript functions to convert CV PDFs to images and extract structured data using Groq's Vision API.

## Features

- **PDF to Image Conversion**: Converts multi-page PDF CVs to high-resolution images
- **AI-Powered Data Extraction**: Uses Groq's Vision API to extract structured CV data
- **Comprehensive Data Structure**: Extracts personal info, experiences, education, skills, and more
- **Image Optimization**: Optimizes images for better OCR results
- **Data Validation**: Validates and cleans extracted data
- **JSON Export**: Saves extracted data in structured JSON format

## Installation

1. Install dependencies:
```bash
cd backend
npm install
```

2. Set up your Groq API key:
```bash
export GROQ_API_KEY="your-groq-api-key-here"
```

You can get a Groq API key from [https://console.groq.com](https://console.groq.com)

## Usage

### Basic Usage

```typescript
import { processCvPdf, saveCvDataToJson } from './cv/cv'

async function processCV() {
  // Process a CV PDF file
  const cvData = await processCvPdf('./path/to/cv.pdf')

  // Save extracted data to JSON
  saveCvDataToJson(cvData, './output/cv_data.json')

  console.log('CV processed successfully!')
  console.log(`Name: ${cvData.firstName} ${cvData.lastName}`)
  console.log(`Email: ${cvData.email}`)
  console.log(`Professional Experiences: ${cvData.professionalExperiences.length}`)
}
```

### Advanced Usage

```typescript
import {
  convertPdfToImages,
  extractCvDataFromImage,
  optimizeImageForOCR,
  validateAndCleanCvData
} from './cv/cv'

async function advancedProcessing() {
  // Convert PDF to images
  const imagePaths = await convertPdfToImages('./cv.pdf', './temp_images')

  // Process each image individually
  for (const imagePath of imagePaths) {
    // Optimize image for better OCR
    const optimizedPath = await optimizeImageForOCR(imagePath)

    // Extract data from image
    const data = await extractCvDataFromImage(optimizedPath)

    // Validate and clean data
    const cleanData = validateAndCleanCvData(data)

    console.log('Extracted data:', cleanData)
  }
}
```

### Run Example

```bash
# Make sure GROQ_API_KEY is set
export GROQ_API_KEY="your-api-key-here"

# Run the example with the provided sample CV
npm run dev
```

## API Reference

### Main Functions

#### `processCvPdf(pdfPath: string, cleanupImages?: boolean): Promise<CvData>`
Main function to process a CV PDF file and extract structured data.

**Parameters:**
- `pdfPath`: Path to the PDF file
- `cleanupImages`: Whether to delete temporary images after processing (default: true)

**Returns:** Complete CV data structure

#### `convertPdfToImages(pdfPath: string, outputDir?: string): Promise<string[]>`
Convert PDF to high-resolution images.

**Parameters:**
- `pdfPath`: Path to the PDF file
- `outputDir`: Directory to save images (default: './temp_images')

**Returns:** Array of image file paths

#### `extractCvDataFromImage(imagePath: string): Promise<Partial<CvData>>`
Extract CV data from a single image using Groq Vision API.

**Parameters:**
- `imagePath`: Path to the CV image

**Returns:** Partial CV data extracted from the image

#### `saveCvDataToJson(cvData: CvData, outputPath: string): void`
Save CV data to a JSON file.

**Parameters:**
- `cvData`: CV data to save
- `outputPath`: Path to save the JSON file

### Data Structure

The extracted CV data follows this TypeScript interface:

```typescript
interface CvData {
  // Personal Information
  lastName: string
  firstName: string
  address: string
  email: string
  phone: string
  linkedin: string
  github: string
  personalWebsite: string
  professionalSummary: string
  jobTitle: string

  // Education
  school: string
  schoolLowerCase: string
  promotionYear: number
  educations: Education[]

  // Experience
  professionalExperiences: Experience[]
  otherExperiences: Experience[]

  // Skills & Additional Info
  hardSkills: string[]
  softSkills: string[]
  languages: Language[]
  publications: string[]
  distinctions: string[]
  hobbies: string[]
  references: string[]
  certifications: Certification[]

  // Calculated Totals
  totalProfessionalExperience: number // in months
  totalOtherExperience: number // in months
  totalEducation: number // in months
}
```

## Requirements

- Node.js 18+
- TypeScript 5+
- Groq API key
- PDF files with readable text (not scanned images without OCR)

## Dependencies

- `groq-sdk`: Groq API client
- `pdf-lib`: PDF manipulation
- `pdf2pic`: PDF to image conversion
- `sharp`: Image processing and optimization

## Error Handling

The functions include comprehensive error handling:

- Invalid PDF files
- Missing API keys
- Network errors
- Image processing failures
- JSON parsing errors

## Performance Considerations

- High-resolution images (300 DPI) for better OCR accuracy
- Image optimization for reduced processing time
- Automatic cleanup of temporary files
- Efficient memory usage with streaming

## Limitations

- Requires readable text in PDFs (not scanned images)
- Groq API rate limits apply
- Maximum 5 images per API request
- Maximum 20MB per image
- Maximum 33 megapixels per image

## Environment Variables

- `GROQ_API_KEY`: Your Groq API key (required)

## Example Output

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "phone": "+1-555-123-4567",
  "jobTitle": "Software Engineer",
  "professionalSummary": "Experienced software engineer with 5+ years...",
  "professionalExperiences": [
    {
      "companyName": "Tech Corp",
      "title": "Senior Software Engineer",
      "location": "San Francisco, CA",
      "startDate": 2020,
      "endDate": 2024,
      "duration": 48,
      "ongoing": false,
      "description": "Led development of microservices...",
      "associatedSkills": ["JavaScript", "React", "Node.js"]
    }
  ],
  "hardSkills": ["JavaScript", "TypeScript", "React", "Node.js"],
  "softSkills": ["Leadership", "Communication", "Problem Solving"],
  "languages": [
    {
      "language": "English",
      "level": "NATIVE_BILINGUAL"
    }
  ],
  "totalProfessionalExperience": 60
}
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License
