from linkedin_scraper import Person, actions
from selenium import webdriver
driver = webdriver.Chrome()

email = "gasod23291@iamtile.com"
password = "n1z>No47a[>O"
actions.login(driver, email, password) # if email and password isnt given, it'll prompt in terminal
person = Person("https://www.linkedin.com/in/lawrenceng119/", driver=driver)

print(person)
