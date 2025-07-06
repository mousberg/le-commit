import { CvData } from '../interfaces'
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
 * Generate JSON schema from CvData interface for the AI model
 * @returns JSON schema object
 */
function getCvDataSchema() {
  return {
    type: "object",
    properties: {
      lastName: { type: "string" },
      firstName: { type: "string" },
      address: { type: "string" },
      email: { type: "string" },
      phone: { type: "string" },
      linkedin: { type: "string" },
      github: { type: "string" },
      personalWebsite: { type: "string" },
      professionalSummary: { type: "string" },
      jobTitle: { type: "string" },
      school: { type: "string" },
      schoolLowerCase: { type: "string" },
      promotionYear: { type: "number" },
      professionalExperiences: {
        type: "array",
        items: {
          type: "object",
          properties: {
            companyName: { type: "string" },
            title: { type: "string" },
            location: { type: "string" },
            type: {
              type: "string",
              enum: ["PERMANENT_CONTRACT", "SELF_EMPLOYED", "FREELANCE", "FIXED_TERM_CONTRACT",
                     "INTERNSHIP", "APPRENTICESHIP", "PERFORMING_ARTS_INTERMITTENT",
                     "PART_TIME_PERMANENT", "CIVIC_SERVICE", "PART_TIME_FIXED_TERM",
                     "SUPPORTED_EMPLOYMENT", "CIVIL_SERVANT", "TEMPORARY_WORKER", "ASSOCIATIVE"]
            },
            startDate: { type: "number" },
            endDate: { type: "number" },
            duration: { type: "number" },
            ongoing: { type: "boolean" },
            description: { type: "string" },
            associatedSkills: { type: "array", items: { type: "string" } }
          }
        }
      },
      otherExperiences: {
        type: "array",
        items: {
          type: "object",
          properties: {
            companyName: { type: "string" },
            title: { type: "string" },
            location: { type: "string" },
            type: {
              type: "string",
              enum: ["PERMANENT_CONTRACT", "SELF_EMPLOYED", "FREELANCE", "FIXED_TERM_CONTRACT",
                     "INTERNSHIP", "APPRENTICESHIP", "PERFORMING_ARTS_INTERMITTENT",
                     "PART_TIME_PERMANENT", "CIVIC_SERVICE", "PART_TIME_FIXED_TERM",
                     "SUPPORTED_EMPLOYMENT", "CIVIL_SERVANT", "TEMPORARY_WORKER", "ASSOCIATIVE"]
            },
            startDate: { type: "number" },
            endDate: { type: "number" },
            duration: { type: "number" },
            ongoing: { type: "boolean" },
            description: { type: "string" },
            associatedSkills: { type: "array", items: { type: "string" } }
          }
        }
      },
      educations: {
        type: "array",
        items: {
          type: "object",
          properties: {
            degree: { type: "string" },
            institution: { type: "string" },
            location: { type: "string" },
            startDate: { type: "number" },
            endDate: { type: "number" },
            duration: { type: "number" },
            ongoing: { type: "boolean" },
            description: { type: "string" },
            associatedSkills: { type: "array", items: { type: "string" } }
          }
        }
      },
      hardSkills: { type: "array", items: { type: "string" } },
      softSkills: { type: "array", items: { type: "string" } },
      languages: {
        type: "array",
        items: {
          type: "object",
          properties: {
            language: { type: "string" },
            level: {
              type: "string",
              enum: ["BASIC_KNOWLEDGE", "LIMITED_PROFESSIONAL", "PROFESSIONAL",
                     "FULL_PROFESSIONAL", "NATIVE_BILINGUAL"]
            }
          }
        }
      },
      publications: { type: "array", items: { type: "string" } },
      distinctions: { type: "array", items: { type: "string" } },
      hobbies: { type: "array", items: { type: "string" } },
      references: { type: "array", items: { type: "string" } },
      certifications: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            issuer: { type: "string" },
            issuedDate: { type: "number" }
          }
        }
      },
      totalProfessionalExperience: { type: "number" },
      totalOtherExperience: { type: "number" },
      totalEducation: { type: "number" }
    }
  }
}

/**
 * Convert PDF to images (one per page)
 * @param pdfPath - Path to the PDF file
 * @param outputDir - Directory to save the images
 * @returns Array of image file paths
 */
export async function convertPdfToImages(
  pdfPath: string,
  outputDir: string = './temp_images'
): Promise<string[]> {
  try {
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }

    // Read PDF file
    const pdfBuffer = fs.readFileSync(pdfPath)

    // Convert PDF to images
    const convert = fromBuffer(pdfBuffer, {
      density: 300,           // High resolution for better OCR
      saveFilename: 'page',
      savePath: outputDir,
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
 * Extract CV data from image using Groq Vision API
 * @param imagePath - Path to the CV image
 * @returns Extracted CV data
 */
export async function extractCvDataFromImage(imagePath: string): Promise<Partial<CvData>> {
  try {
    const base64Image = encodeImageToBase64(imagePath)
    const schema = getCvDataSchema()

    const systemPrompt = `You are a CV/Resume parser. Extract information from the CV image and return it as JSON following the provided schema exactly.

Rules:
- Use YYYY format for dates (e.g., 2023)
- Calculate duration in months between start/end dates
- Set ongoing=true for current positions/education
- Use empty strings for missing text, 0 for missing numbers, empty arrays for missing lists
- Calculate totals: sum all experience/education durations`

    const userPrompt = `Extract all CV information from this image and return it as JSON matching this exact schema:

${JSON.stringify(schema, null, 2)}

Return only valid JSON, no explanations.`

    const completion = await groq.chat.completions.create({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
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
    })

    const extractedData = JSON.parse(completion.choices[0]?.message?.content || '{}')
    console.log(extractedData)
    return extractedData as Partial<CvData>

  } catch (error) {
    console.error('Error extracting CV data from image:', error)
    throw new Error(`Failed to extract CV data: ${error}`)
  }
}

/**
 * Process multiple CV images and merge the extracted data
 * @param imagePaths - Array of image paths
 * @returns Merged CV data
 */
export async function processCvImages(imagePaths: string[]): Promise<CvData> {
  try {
    const extractedDataArray: Partial<CvData>[] = []

    // Process each image
    for (const imagePath of imagePaths) {
      console.log(`Processing image: ${imagePath}`)

      // Optimize image for better OCR
      const optimizedPath = await optimizeImageForOCR(imagePath)

      // Extract data from image
      const data = await extractCvDataFromImage(optimizedPath)
      extractedDataArray.push(data)

      // Clean up optimized image if it's different from original
      if (optimizedPath !== imagePath) {
        fs.unlinkSync(optimizedPath)
      }
    }

    // Merge data from all pages
    const mergedData = mergeCvData(extractedDataArray)

    return mergedData
  } catch (error) {
    console.error('Error processing CV images:', error)
    throw new Error(`Failed to process CV images: ${error}`)
  }
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
    school: '',
    schoolLowerCase: '',
    promotionYear: 0,
    professionalExperiences: [],
    otherExperiences: [],
    educations: [],
    hardSkills: [],
    softSkills: [],
    languages: [],
    publications: [],
    distinctions: [],
    hobbies: [],
    references: [],
    certifications: [],
    totalProfessionalExperience: 0,
    totalOtherExperience: 0,
    totalEducation: 0,
  }

  // Merge data from all sources
  for (const data of dataArray) {
    if (!data) continue

    // Merge simple fields (take first non-empty value)
    Object.keys(merged).forEach(key => {
      if (typeof merged[key as keyof CvData] === 'string' && !merged[key as keyof CvData] && data[key as keyof CvData]) {
        (merged as any)[key] = data[key as keyof CvData]
      }
      if (typeof merged[key as keyof CvData] === 'number' && !merged[key as keyof CvData] && data[key as keyof CvData]) {
        (merged as any)[key] = data[key as keyof CvData]
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
    if (data.hardSkills) {
      merged.hardSkills = [...new Set([...merged.hardSkills, ...data.hardSkills])]
    }
    if (data.softSkills) {
      merged.softSkills = [...new Set([...merged.softSkills, ...data.softSkills])]
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
  }

  // Calculate totals
  merged.totalProfessionalExperience = merged.professionalExperiences.reduce((sum, exp) => sum + exp.duration, 0)
  merged.totalOtherExperience = merged.otherExperiences.reduce((sum, exp) => sum + exp.duration, 0)
  merged.totalEducation = merged.educations.reduce((sum, edu) => sum + edu.duration, 0)

  // Set school fields
  if (merged.educations.length > 0) {
    merged.school = merged.educations[0].institution
    merged.schoolLowerCase = merged.school.toLowerCase()
    merged.promotionYear = merged.educations[0].endDate
  }

  return merged
}

/**
 * Main function to process a CV PDF file
 * @param pdfPath - Path to the PDF file
 * @param cleanupImages - Whether to delete temporary images after processing
 * @returns Extracted CV data
 */
export async function processCvPdf(
  pdfPath: string,
  cleanupImages: boolean = true
): Promise<CvData> {
  try {
    console.log(`Processing CV PDF: ${pdfPath}`)

    // Convert PDF to images
    const imagePaths = await convertPdfToImages(pdfPath)
    console.log(`Converted PDF to ${imagePaths.length} images`)

    // Process images to extract CV data
    const cvData = await processCvImages(imagePaths)

    // Cleanup temporary images
    if (cleanupImages) {
      for (const imagePath of imagePaths) {
        try {
          fs.unlinkSync(imagePath)
        } catch (error) {
          console.warn(`Failed to delete temporary image: ${imagePath}`)
        }
      }

      // Remove temp directory if empty
      try {
        const tempDir = path.dirname(imagePaths[0])
        if (fs.readdirSync(tempDir).length === 0) {
          fs.rmdirSync(tempDir)
        }
      } catch (error) {
        console.warn('Failed to remove temporary directory')
      }
    }

    console.log('CV processing completed successfully')
    return cvData

  } catch (error) {
    console.error('Error processing CV PDF:', error)
    throw new Error(`Failed to process CV PDF: ${error}`)
  }
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
    school: cvData.school || '',
    schoolLowerCase: (cvData.school || '').toLowerCase(),
    promotionYear: cvData.promotionYear || 0,
    professionalExperiences: cvData.professionalExperiences || [],
    otherExperiences: cvData.otherExperiences || [],
    educations: cvData.educations || [],
    hardSkills: cvData.hardSkills || [],
    softSkills: cvData.softSkills || [],
    languages: cvData.languages || [],
    publications: cvData.publications || [],
    distinctions: cvData.distinctions || [],
    hobbies: cvData.hobbies || [],
    references: cvData.references || [],
    certifications: cvData.certifications || [],
    totalProfessionalExperience: cvData.totalProfessionalExperience || 0,
    totalOtherExperience: cvData.totalOtherExperience || 0,
    totalEducation: cvData.totalEducation || 0,
  }

  // Validate email format
  if (cleanData.email && !isValidEmail(cleanData.email)) {
    console.warn(`Invalid email format: ${cleanData.email}`)
  }

  // Validate dates
  cleanData.professionalExperiences = cleanData.professionalExperiences.map(exp => ({
    ...exp,
    startDate: exp.startDate || 0,
    endDate: exp.endDate || 0,
    duration: exp.duration || 0,
  }))

  cleanData.educations = cleanData.educations.map(edu => ({
    ...edu,
    startDate: edu.startDate || 0,
    endDate: edu.endDate || 0,
    duration: edu.duration || 0,
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
    const jsonData = JSON.stringify(cvData, null, 2)
    fs.writeFileSync(outputPath, jsonData, 'utf8')
    console.log(`CV data saved to: ${outputPath}`)
  } catch (error) {
    console.error('Error saving CV data:', error)
    throw new Error(`Failed to save CV data: ${error}`)
  }
}
