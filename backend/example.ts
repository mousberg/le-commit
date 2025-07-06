import { processCvPdf, saveCvDataToJson } from './cv/cv'
import * as path from 'path'

/**
 * Example usage of CV processing functions
 */
async function exampleUsage() {
  try {
    // Path to the example CV PDF
    const pdfPath = path.join(__dirname, '../data/exampleCVs/jaldevik-cv.pdf')

    // Process the CV PDF
    console.log('Starting CV processing...')
    const cvData = await processCvPdf(pdfPath, false)

    // Save the extracted data to JSON
    const outputPath = path.join(__dirname, '../data/extracted_cv_data.json')
    saveCvDataToJson(cvData, outputPath)

    // Display summary
    console.log('\n=== CV Processing Summary ===')
    console.log(`Name: ${cvData.firstName} ${cvData.lastName}`)
    console.log(`Email: ${cvData.email}`)
    console.log(`Phone: ${cvData.phone}`)
    console.log(`Job Title: ${cvData.jobTitle}`)
    console.log(`Professional Experiences: ${cvData.professionalExperiences.length}`)
    console.log(`Education: ${cvData.educations.length}`)
    console.log(`Hard Skills: ${cvData.hardSkills.length}`)
    console.log(`Soft Skills: ${cvData.softSkills.length}`)
    console.log(`Languages: ${cvData.languages.length}`)
    console.log(`Certifications: ${cvData.certifications.length}`)
    console.log(`Total Professional Experience: ${cvData.totalProfessionalExperience} months`)
    console.log(`Total Education: ${cvData.totalEducation} months`)

    console.log('\n=== Processing Complete ===')
    console.log(`Full CV data saved to: ${outputPath}`)

  } catch (error) {
    console.error('Error processing CV:', error)
    process.exit(1)
  }
}

// Run the example if this file is executed directly
if (require.main === module) {
  // Make sure GROQ_API_KEY is set
  if (!process.env.GROQ_API_KEY) {
    console.error('Error: GROQ_API_KEY environment variable is not set')
    console.log('Please set your Groq API key:')
    console.log('export GROQ_API_KEY="your-api-key-here"')
    process.exit(1)
  }

  exampleUsage()
}

export { exampleUsage }
