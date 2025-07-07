import { processCvPdf } from '../cv.js'
import { Experience } from '../interfaces/cv'
import * as path from 'path'

/**
 * Example usage of CV processing functions
 */
async function exampleUsage() {
  try {
    // Path to the example CV PDF
    const pdfPath = path.join(__dirname, '../../../../data/exampleCVs/JosephineP-cv.pdf')

    // Process the CV PDF
    console.log('Starting CV processing...')
    const cvData = await processCvPdf(pdfPath, true)

    // Save the extracted data to JSON
    // const outputPath = path.join(__dirname, '../../../../data/extracted_cv_data.json')
    // saveCvDataToJson(cvData, outputPath)

    // Display summary
    console.log('\n=== CV Processing Summary ===')
    console.log(`Name: ${cvData.firstName} ${cvData.lastName}`)
    console.log(`Email: ${cvData.email}`)
    console.log(`Phone: ${cvData.phone}`)
    console.log(`Job Title: ${cvData.jobTitle}`)
        console.log(`Professional Experiences: ${cvData.professionalExperiences.length}`)
    console.log(`Education: ${cvData.educations.length}`)
    console.log(`Skills: ${cvData.skills.length}`)
    console.log(`Languages: ${cvData.languages.length}`)
    console.log(`Certifications: ${cvData.certifications.length}`)
    console.log(`Additional Information: ${Object.keys(cvData.other).length} items`)

    // Display date ranges for experiences
    if (cvData.professionalExperiences.length > 0) {
      console.log('\nProfessional Experience Timeline:')
      cvData.professionalExperiences.forEach((exp: Experience, index: number) => {
        const startDate = exp.startMonth ? `${exp.startMonth}/${exp.startYear}` : exp.startYear.toString()
        const endDate = exp.ongoing ? 'Present' :
          (exp.endYear ? (exp.endMonth ? `${exp.endMonth}/${exp.endYear}` : exp.endYear.toString()) : 'Unknown')
        console.log(`  ${index + 1}. ${exp.title} at ${exp.companyName} (${startDate} - ${endDate})`)
      })
    }

    console.log('\n=== Processing Complete ===')

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
