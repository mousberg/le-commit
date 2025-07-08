import { CvData, ContractType, LanguageLevel } from './interfaces/cv'
import { Groq } from 'groq-sdk'
import * as fs from 'fs'
import * as path from 'path'
import { PDFDocument } from 'pdf-lib'
import { fromBuffer } from 'pdf2pic'
import sharp from 'sharp'

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

/**
 * Generate JSON schema for CvData interface
 */
function getCvDataSchema() {
  return {
    type: "object",
    description: "CV/Resume data structure",
    properties: {
      lastName: {
        type: "string",
        description: "Last name/surname of the person"
      },
      firstName: {
        type: "string",
        description: "First name/given name of the person"
      },
      address: {
        type: "string",
        description: "Full address or location"
      },
      email: {
        type: "string",
        description: "Email address"
      },
      phone: {
        type: "string",
        description: "Phone number"
      },
      linkedin: {
        type: "string",
        description: "LinkedIn profile URL or username"
      },
      github: {
        type: "string",
        description: "GitHub profile URL or username"
      },
      personalWebsite: {
        type: "string",
        description: "Personal website or portfolio URL"
      },
      professionalSummary: {
        type: "string",
        description: "Professional summary or objective statement"
      },
      jobTitle: {
        type: "string",
        description: "Current or desired job title"
      },
      professionalExperiences: {
        type: "array",
        description: "Professional work experiences",
        items: {
          type: "object",
          properties: {
            companyName: { type: "string", description: "Company name" },
            title: { type: "string", description: "Job title/position" },
            location: { type: "string", description: "Work location" },
            type: {
              type: "string",
              enum: Object.values(ContractType),
              description: "Type of employment contract"
            },
            startYear: { type: "number", description: "Start year (YYYY)" },
            startMonth: { type: "number", minimum: 1, maximum: 12, description: "Start month (1-12), optional" },
            endYear: { type: "number", description: "End year (YYYY), omit if ongoing" },
            endMonth: { type: "number", minimum: 1, maximum: 12, description: "End month (1-12), optional" },
            ongoing: { type: "boolean", description: "Whether the position is current/ongoing" },
            description: { type: "string", description: "Job description and responsibilities" },
            associatedSkills: {
              type: "array",
              items: { type: "string" },
              description: "Skills used in this role"
            }
          },
          required: ["title", "location", "type", "startYear", "ongoing", "description", "associatedSkills"]
        }
      },
      otherExperiences: {
        type: "array",
        description: "Other experiences (volunteering, projects, etc.)",
        items: {
          type: "object",
          properties: {
            companyName: { type: "string", description: "Organization name" },
            title: { type: "string", description: "Role/position title" },
            location: { type: "string", description: "Location" },
            type: {
              type: "string",
              enum: Object.values(ContractType),
              description: "Type of engagement"
            },
            startYear: { type: "number", description: "Start year (YYYY)" },
            startMonth: { type: "number", minimum: 1, maximum: 12, description: "Start month (1-12), optional" },
            endYear: { type: "number", description: "End year (YYYY), omit if ongoing" },
            endMonth: { type: "number", minimum: 1, maximum: 12, description: "End month (1-12), optional" },
            ongoing: { type: "boolean", description: "Whether ongoing" },
            description: { type: "string", description: "Description of activities" },
            associatedSkills: {
              type: "array",
              items: { type: "string" },
              description: "Skills gained/used"
            }
          },
          required: ["title", "location", "type", "startYear", "ongoing", "description", "associatedSkills"]
        }
      },
      educations: {
        type: "array",
        description: "Educational background",
        items: {
          type: "object",
          properties: {
            degree: { type: "string", description: "Degree or qualification name" },
            institution: { type: "string", description: "School/university name" },
            location: { type: "string", description: "Institution location" },
            startYear: { type: "number", description: "Start year (YYYY)" },
            startMonth: { type: "number", minimum: 1, maximum: 12, description: "Start month (1-12), optional" },
            endYear: { type: "number", description: "End year (YYYY), omit if ongoing" },
            endMonth: { type: "number", minimum: 1, maximum: 12, description: "End month (1-12), optional" },
            ongoing: { type: "boolean", description: "Whether currently studying" },
            description: { type: "string", description: "Additional details about the education" },
            associatedSkills: {
              type: "array",
              items: { type: "string" },
              description: "Skills learned"
            }
          },
          required: ["degree", "institution", "location", "startYear", "ongoing", "description", "associatedSkills"]
        }
      },
      skills: {
        type: "array",
        items: { type: "string" },
        description: "All skills (technical, professional, and soft skills)"
      },
      languages: {
        type: "array",
        description: "Language proficiencies",
        items: {
          type: "object",
          properties: {
            language: { type: "string", description: "Language name" },
            level: {
              type: "string",
              enum: Object.values(LanguageLevel),
              description: "Proficiency level"
            }
          },
          required: ["language", "level"]
        }
      },
      publications: {
        type: "array",
        items: { type: "string" },
        description: "Publications, papers, articles"
      },
      distinctions: {
        type: "array",
        items: { type: "string" },
        description: "Awards, honors, recognitions"
      },
      hobbies: {
        type: "array",
        items: { type: "string" },
        description: "Hobbies and interests"
      },
      references: {
        type: "array",
        items: { type: "string" },
        description: "References or recommendations"
      },
      certifications: {
        type: "array",
        description: "Professional certifications",
        items: {
          type: "object",
          properties: {
            title: { type: "string", description: "Certification name" },
            issuer: { type: "string", description: "Issuing organization" },
            issuedYear: { type: "number", description: "Year issued (YYYY)" },
            issuedMonth: { type: "number", minimum: 1, maximum: 12, description: "Month issued (1-12), optional" }
          },
          required: ["title", "issuer", "issuedYear"]
        }
      },
      other: {
        type: "object",
        description: "Any additional information not covered by other fields",
        additionalProperties: true
      }
    },
    required: ["lastName", "firstName", "professionalExperiences", "educations", "skills", "languages", "certifications", "other"]
  }
}

/**
 * Convert PDF to images (one per page)
 * @param pdfPath - Path to the PDF file
 * @param outputDir - Directory to save the images
 * @param tempDirSuffix - Unique suffix for temp directory to prevent race conditions
 * @returns Array of image file paths
 */
export async function convertPdfToImages(
  pdfPath: string,
  outputDir: string = './temp_images',
  tempDirSuffix?: string
): Promise<string[]> {
  try {
    // Create unique output directory if suffix provided (as subdirectory for better permissions)
    const actualOutputDir = tempDirSuffix ? `${outputDir}/${tempDirSuffix}` : outputDir;

    // Ensure output directory exists
    if (!fs.existsSync(actualOutputDir)) {
      fs.mkdirSync(actualOutputDir, { recursive: true })
    }

    // Read PDF file
    const pdfBuffer = fs.readFileSync(pdfPath)

    // Convert PDF to images
    const convert = fromBuffer(pdfBuffer, {
      density: 300,           // High resolution for better OCR
      saveFilename: 'page',
      savePath: actualOutputDir,
      format: 'png',
      width: 2480,           // A4 width at 300 DPI
      height: 3508,          // A4 height at 300 DPI
    })

    // Get PDF page count
    const pdfDoc = await PDFDocument.load(pdfBuffer)
    const pageCount = pdfDoc.getPageCount()

    const imagePaths: string[] = []

    // Convert each page
    for (let i = 1; i <= pageCount; i++) {
      const result = await convert(i)
      if (result.path) {
        imagePaths.push(result.path)
      }
    }

    return imagePaths
  } catch (error) {
    console.error('Error converting PDF to images:', error)
    throw new Error(`Failed to convert PDF to images: ${error}`)
  }
}

/**
 * Encode image to base64 for Groq API
 * @param imagePath - Path to the image file
 * @returns Base64 encoded string
 */
export function encodeImageToBase64(imagePath: string): string {
  try {
    const imageBuffer = fs.readFileSync(imagePath)
    return imageBuffer.toString('base64')
  } catch (error) {
    console.error('Error encoding image to base64:', error)
    throw new Error(`Failed to encode image: ${error}`)
  }
}

/**
 * Optimize image for better OCR results
 * @param imagePath - Path to the input image
 * @param outputPath - Path for the optimized image
 * @returns Path to the optimized image
 */
export async function optimizeImageForOCR(
  imagePath: string,
  outputPath?: string
): Promise<string> {
  try {
    const output = outputPath || imagePath.replace('.png', '_optimized.png')

    await sharp(imagePath)
      .resize(2480, 3508, { fit: 'inside', withoutEnlargement: true })
      .normalize()
      .sharpen()
      .png({ quality: 95 })
      .toFile(output)

    return output
  } catch (error) {
    console.error('Error optimizing image:', error)
    throw new Error(`Failed to optimize image: ${error}`)
  }
}

/**
 * Clean and fix common JSON issues from LLM output
 * @param rawData - Raw parsed JSON data
 * @returns Cleaned data that better matches CvData schema
 */
function cleanAndFixJsonData(rawData: unknown): Partial<CvData> {
  if (!rawData || typeof rawData !== 'object') {
    console.warn('Invalid raw data received, using empty object');
    return {};
  }

  const cleaned: Record<string, unknown> = { ...rawData as Record<string, unknown> };

  // Fix common field name issues
  if (cleaned.Hobbies) {
    cleaned.hobbies = cleaned.Hobbies;
    delete cleaned.Hobbies;
  }

  // Fix number fields that might be strings or empty
  const numberFields = ['startYear', 'endYear', 'startMonth', 'endMonth', 'issuedYear', 'issuedMonth'];

  function fixNumberFields(obj: Record<string, unknown>) {
    if (!obj || typeof obj !== 'object') return;

    for (const field of numberFields) {
      if (obj[field] !== undefined) {
        if (obj[field] === '' || obj[field] === null) {
          delete obj[field]; // Remove empty/null number fields
        } else if (typeof obj[field] === 'string') {
          const parsed = parseInt(obj[field], 10);
          if (!isNaN(parsed)) {
            obj[field] = parsed;
          } else {
            delete obj[field];
          }
        }
      }
    }
  }

  // Fix arrays that might have nested objects with number issues
  if (Array.isArray(cleaned.professionalExperiences)) {
    (cleaned.professionalExperiences as Record<string, unknown>[]).forEach(fixNumberFields);
  }
  if (Array.isArray(cleaned.otherExperiences)) {
    (cleaned.otherExperiences as Record<string, unknown>[]).forEach(fixNumberFields);
  }
  if (Array.isArray(cleaned.educations)) {
    (cleaned.educations as Record<string, unknown>[]).forEach(fixNumberFields);
  }
  if (Array.isArray(cleaned.certifications)) {
    (cleaned.certifications as Record<string, unknown>[]).forEach(fixNumberFields);
  }

  // Ensure required arrays exist
  const arrayFields = ['professionalExperiences', 'otherExperiences', 'educations', 'skills', 'languages', 'publications', 'distinctions', 'hobbies', 'references', 'certifications'];
  for (const field of arrayFields) {
    if (!Array.isArray(cleaned[field])) {
      cleaned[field] = [];
    }
  }

  // Ensure required object exists
  if (!cleaned.other || typeof cleaned.other !== 'object') {
    cleaned.other = {};
  }

  // Remove any extra fields that might cause issues
  const validFields = [
    'lastName', 'firstName', 'address', 'email', 'phone', 'linkedin', 'github',
    'personalWebsite', 'professionalSummary', 'jobTitle', 'professionalExperiences',
    'otherExperiences', 'educations', 'skills', 'languages', 'publications',
    'distinctions', 'hobbies', 'references', 'certifications', 'other'
  ];

  const result: Record<string, unknown> = {};
  for (const field of validFields) {
    if (cleaned[field] !== undefined) {
      result[field] = cleaned[field];
    }
  }

  return result as Partial<CvData>;
}

/**
 * Extract data from image using Groq Vision API with robust error handling
 * @param imagePath - Path to the document image
 * @param documentType - Type of document ('cv' or 'linkedin')
 * @returns Extracted document data
 */
export async function extractDataFromImage(
  imagePath: string,
  documentType: 'cv' | 'linkedin'
): Promise<Partial<CvData>> {
  try {
    const base64Image = encodeImageToBase64(imagePath)
    const schema = getCvDataSchema()

    const systemPrompt = `
    You are a CV/Resume parser. Extract information from the CV image and return it as valid JSON.

Guidelines:
- Extract years as integers (e.g., 2023), months as integers 1-12
- For ongoing positions: set "ongoing": true
- Do not include any text outside the JSON object
- Ensure all quotes and brackets are properly closed`

    const userPrompt = `Extract CV information from this image and return as JSON with this schema: ${JSON.stringify(schema, null, 2)}`

    const completion = await groq.chat.completions.create({
      model: "meta-llama/llama-4-maverick-17b-128e-instruct",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: userPrompt
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/png;base64,${base64Image}`
              }
            }
          ]
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    })

    const responseText = completion.choices[0]?.message?.content || '{}'

    // Try to parse JSON with fallback handling
    let rawData;
    try {
      rawData = JSON.parse(responseText);
    } catch {
      console.warn(`${documentType.toUpperCase()} JSON parse failed, attempting to extract JSON from response...`);

      // Try to extract JSON from markdown code blocks or other formatting
      const jsonMatch = responseText.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) ||
                       responseText.match(/(\{[\s\S]*\})/);

      if (jsonMatch) {
        try {
          rawData = JSON.parse(jsonMatch[1]);
        } catch {
          console.error('Could not parse extracted JSON, using empty object');
          rawData = {};
        }
      } else {
        console.error('Could not find JSON in response, using empty object');
        rawData = {};
      }
    }

    // Clean and fix the data
    const cleanedData = cleanAndFixJsonData(rawData);
    console.log(`Cleaned ${documentType.toUpperCase()} data:`, cleanedData);

    return cleanedData;

  } catch (error) {
    console.error(`Error extracting ${documentType.toUpperCase()} data from image:`, error)
    // Instead of throwing, return empty data to allow processing to continue
    console.warn(`Returning empty ${documentType.toUpperCase()} data due to extraction error`);
    return {
      lastName: '',
      firstName: '',
      professionalExperiences: [],
      educations: [],
      skills: [],
      languages: [],
      certifications: [],
      other: {}
    };
  }
}

/**
 * Extract CV data from image using Groq Vision API with robust error handling
 * @param imagePath - Path to the CV image
 * @returns Extracted CV data
 */
export async function extractCvDataFromImage(imagePath: string): Promise<Partial<CvData>> {
  return extractDataFromImage(imagePath, 'cv');
}

/**
 * Extract LinkedIn data from image using the same robust approach
 */
export async function extractLinkedInDataFromImage(imagePath: string): Promise<Partial<CvData>> {
  return extractDataFromImage(imagePath, 'linkedin');
}

/**
 * Process multiple LinkedIn images and merge the extracted data
 * @param imagePaths - Array of image paths
 * @returns Merged LinkedIn data
 */
export async function processLinkedInImages(imagePaths: string[]): Promise<CvData> {
  return processImages(imagePaths, 'linkedin');
}

/**
 * Process multiple CV images and merge the extracted data
 * @param imagePaths - Array of image paths
 * @returns Merged CV data
 */
/**
 * Process multiple document images and merge the extracted data
 * @param imagePaths - Array of image paths
 * @param documentType - Type of document ('cv' or 'linkedin')
 * @returns Merged document data
 */
export async function processImages(
  imagePaths: string[],
  documentType: 'cv' | 'linkedin'
): Promise<CvData> {
  const extractedDataArray: Partial<CvData>[] = []
  const optimizedPaths: string[] = []

  try {
    // Process each image
    for (const imagePath of imagePaths) {
      console.log(`Processing ${documentType.toUpperCase()} image: ${imagePath}`)

      // Optimize image for better OCR
      const optimizedPath = await optimizeImageForOCR(imagePath)

      // Track optimized path for cleanup
      if (optimizedPath !== imagePath) {
        optimizedPaths.push(optimizedPath)
      }

      // Extract data from image
      const data = await extractDataFromImage(optimizedPath, documentType)
      extractedDataArray.push(data)
    }

    // Merge data from all pages
    const mergedData = mergeCvData(extractedDataArray)

    return mergedData
  } catch (error) {
    console.error(`Error processing ${documentType.toUpperCase()} images:`, error)
    throw new Error(`Failed to process ${documentType.toUpperCase()} images: ${error}`)
  } finally {
    // Always clean up optimized images
    for (const optimizedPath of optimizedPaths) {
      try {
        fs.unlinkSync(optimizedPath)
      } catch {
        console.warn(`Failed to delete optimized image: ${optimizedPath}`)
      }
    }
  }
}

/**
 * Process multiple CV images and merge the extracted data
 * @param imagePaths - Array of image paths
 * @returns Merged CV data
 */
export async function processCvImages(imagePaths: string[]): Promise<CvData> {
  return processImages(imagePaths, 'cv');
}

/**
 * Merge CV data from multiple pages/sources
 * @param dataArray - Array of partial CV data
 * @returns Merged complete CV data
 */
function mergeCvData(dataArray: Partial<CvData>[]): CvData {
  const merged: CvData = {
    lastName: '',
    firstName: '',
    address: '',
    email: '',
    phone: '',
    linkedin: '',
    github: '',
    personalWebsite: '',
    professionalSummary: '',
    jobTitle: '',
    professionalExperiences: [],
    otherExperiences: [],
    educations: [],
    skills: [],
    languages: [],
    publications: [],
    distinctions: [],
    hobbies: [],
    references: [],
    certifications: [],
    other: {},
  }

  // Merge data from all sources
  for (const data of dataArray) {
    if (!data) continue

    // Merge simple fields (take first non-empty value)
    Object.keys(merged).forEach(key => {
      const typedKey = key as keyof CvData
      if (typeof merged[typedKey] === 'string' && !merged[typedKey] && data[typedKey]) {
        (merged as unknown as Record<string, unknown>)[key] = data[typedKey]
      }
    })

    // Merge arrays (combine and deduplicate)
    if (data.professionalExperiences) {
      merged.professionalExperiences = [...merged.professionalExperiences, ...data.professionalExperiences]
    }
    if (data.otherExperiences) {
      merged.otherExperiences = [...merged.otherExperiences, ...data.otherExperiences]
    }
    if (data.educations) {
      merged.educations = [...merged.educations, ...data.educations]
    }
    if (data.skills) {
      merged.skills = [...new Set([...merged.skills, ...data.skills])]
    }
    if (data.languages) {
      merged.languages = [...merged.languages, ...data.languages]
    }
    if (data.publications) {
      merged.publications = [...new Set([...merged.publications, ...data.publications])]
    }
    if (data.distinctions) {
      merged.distinctions = [...new Set([...merged.distinctions, ...data.distinctions])]
    }
    if (data.hobbies) {
      merged.hobbies = [...new Set([...merged.hobbies, ...data.hobbies])]
    }
    if (data.references) {
      merged.references = [...new Set([...merged.references, ...data.references])]
    }
    if (data.certifications) {
      merged.certifications = [...merged.certifications, ...data.certifications]
    }

    // Merge other fields
    if (data.other) {
      merged.other = { ...merged.other, ...data.other }
    }
  }

  return merged
}

/**
 * Main function to process a PDF file
 * @param pdfPath - Path to the PDF file
 * @param documentType - Type of document ('cv' or 'linkedin')
 * @param cleanupImages - Whether to delete temporary images after processing
 * @param tempDirSuffix - Unique suffix for temp directory to prevent race conditions
 * @returns Extracted document data
 */
export async function processPdf(
  pdfPath: string,
  documentType: 'cv' | 'linkedin',
  cleanupImages: boolean = true,
  tempDirSuffix?: string
): Promise<CvData> {
  let imagePaths: string[] = []

  try {
    console.log(`Processing ${documentType.toUpperCase()} PDF: ${pdfPath}`)
    imagePaths = await convertPdfToImages(pdfPath, './temp_images', tempDirSuffix)
    console.log(`Converted ${documentType.toUpperCase()} PDF to ${imagePaths.length} images`)
    const documentData = await processImages(imagePaths, documentType)
    console.log(`${documentType.toUpperCase()} processing completed successfully`)
    return documentData
  } catch (error) {
    console.error(`Error processing ${documentType.toUpperCase()} PDF:`, error)
    throw new Error(`Failed to process ${documentType.toUpperCase()} PDF: ${error}`)
  } finally {
    // Always attempt cleanup if enabled and we have image paths
    if (cleanupImages && imagePaths.length > 0) {
      for (const imagePath of imagePaths) {
        try {
          fs.unlinkSync(imagePath)
        } catch {
          console.warn(`Failed to delete temporary image: ${imagePath}`)
        }
      }
      try {
        const tempDir = path.dirname(imagePaths[0])
        if (fs.readdirSync(tempDir).length === 0) {
          fs.rmdirSync(tempDir)
        }
      } catch {
        console.warn('Failed to remove temporary directory')
      }
    }
  }
}

/**
 * Main function to process a LinkedIn PDF file
 * @param pdfPath - Path to the PDF file
 * @param cleanupImages - Whether to delete temporary images after processing
 * @param tempDirSuffix - Unique suffix for temp directory to prevent race conditions
 * @returns Extracted LinkedIn data
 */
export async function processLinkedInPdf(
  pdfPath: string,
  cleanupImages: boolean = true,
  tempDirSuffix?: string
): Promise<CvData> {
  return processPdf(pdfPath, 'linkedin', cleanupImages, tempDirSuffix);
}

/**
 * Main function to process a CV PDF file
 * @param pdfPath - Path to the PDF file
 * @param cleanupImages - Whether to delete temporary images after processing
 * @param tempDirSuffix - Unique suffix for temp directory to prevent race conditions
 * @returns Extracted CV data
 */
export async function processCvPdf(
  pdfPath: string,
  cleanupImages: boolean = true,
  tempDirSuffix?: string
): Promise<CvData> {
  return processPdf(pdfPath, 'cv', cleanupImages, tempDirSuffix);
}

/**
 * Validate and clean CV data
 * @param cvData - Raw CV data to validate
 * @returns Validated and cleaned CV data
 */
export function validateAndCleanCvData(cvData: Partial<CvData>): CvData {
  const cleanData: CvData = {
    lastName: cvData.lastName || '',
    firstName: cvData.firstName || '',
    address: cvData.address || '',
    email: cvData.email || '',
    phone: cvData.phone || '',
    linkedin: cvData.linkedin || '',
    github: cvData.github || '',
    personalWebsite: cvData.personalWebsite || '',
    professionalSummary: cvData.professionalSummary || '',
    jobTitle: cvData.jobTitle || '',
    professionalExperiences: cvData.professionalExperiences || [],
    otherExperiences: cvData.otherExperiences || [],
    educations: cvData.educations || [],
    skills: cvData.skills || [],
    languages: cvData.languages || [],
    publications: cvData.publications || [],
    distinctions: cvData.distinctions || [],
    hobbies: cvData.hobbies || [],
    references: cvData.references || [],
    certifications: cvData.certifications || [],
    other: cvData.other || {},
  }

  // Validate email format
  if (cleanData.email && !isValidEmail(cleanData.email)) {
    console.warn(`Invalid email format: ${cleanData.email}`)
  }

  // Validate dates
  cleanData.professionalExperiences = cleanData.professionalExperiences.map(exp => ({
    ...exp,
    startYear: exp.startYear || 0,
    endYear: exp.ongoing ? undefined : (exp.endYear || 0),
  }))

  cleanData.educations = cleanData.educations.map(edu => ({
    ...edu,
    startYear: edu.startYear || 0,
    endYear: edu.ongoing ? undefined : (edu.endYear || 0),
  }))

  return cleanData
}

/**
 * Utility function to validate email format
 * @param email - Email string to validate
 * @returns True if valid email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Save CV data to JSON file
 * @param cvData - CV data to save
 * @param outputPath - Path to save the JSON file
 */
export function saveCvDataToJson(cvData: CvData, outputPath: string): void {
  try {
    // Ensure the directory exists
    const dir = path.dirname(outputPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    const jsonData = JSON.stringify(cvData, null, 2)
    fs.writeFileSync(outputPath, jsonData, 'utf8')
    console.log(`CV data saved to: ${outputPath}`)
  } catch (error) {
    console.error('Error saving CV data:', error)
    throw new Error(`Failed to save CV data: ${error}`)
  }
}
