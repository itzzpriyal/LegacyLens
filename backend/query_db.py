import sqlite3

conn = sqlite3.connect('legacylens.db')
cursor = conn.cursor()
cursor.execute("SELECT id, name, total_files, avg_risk_score, overall_debt_score, overall_security_score FROM projects WHERE name='Chat-Assistant'")
projects = cursor.fetchall()
print("Projects:", projects)
