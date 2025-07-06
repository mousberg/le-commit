from groq import Groq


# dataclass for profile output
from dataclasses import dataclass

@dataclass
class LinkedinExperience:
    company: str
    title: str
    start_date: str
    end_date: str


@dataclass
class LinkedinProfile:
    name: str
    headline: str
    location: str
    connections: int
    profile_url: str
    experiences: list[LinkedinExperience]




client = Groq()

completion = client.chat.completions.create(
    messages=[
        {
            "role": "user",
            "content": "List out linkedin data from the following url: https://www.linkedin.com/in/albin-jaldevik",
        }
    ],
    # Change model to compound-beta to use agentic tooling
    # model: "llama-3.3-70b-versatile",
    model="compound-beta",
    include_domains=["linkedin.com"],
)

print(completion.choices[0].message.content)
print(completion.choices[0].message.executed_tools)

# Print all tool calls
# print(completion.choices[0].message.executed_tools)
