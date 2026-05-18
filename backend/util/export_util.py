import csv
from datetime import date

from django.http import HttpResponse


def export_csv(filename, extract_function):
    response = HttpResponse(content_type='text/csv; charset=utf-8-sig')
    response['Content-Disposition'] = f'attachment; filename={filename}_{str(date.today())}.csv'
    writer = csv.writer(response, delimiter=';')
    extract_function(writer)
    return response
