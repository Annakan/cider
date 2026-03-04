import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { DocumentsService } from './documents.service';
import { AppDB } from '../indexed-db/db';
import * as yaml from 'js-yaml';

@Injectable({ providedIn: 'root' })
export class StaticDataService {
  private dataSubject = new BehaviorSubject<Record<string, any>>({});

  constructor(private documentsService: DocumentsService, private db: AppDB) {
    // OPTIMIZATION: Only reload YAML when the documents table changes.
    // If this causes stale data issues, revert to: this.db.onChange().subscribe(() => this.reload());
    this.db.onChange().subscribe((change: any) => {
      if (change?.tableName === 'documents') {
        this.reload();
      }
    });
    this.db.onLoad().subscribe(() => this.reload());
  }

  private async reload() {
    try {
      const yamlDocs = await this.documentsService.getAll({ mime: 'application/x-yaml' });
      const data: Record<string, any> = {};
      for (const doc of yamlDocs) {
        try {
          data[doc.name] = yaml.load(doc.content);
        } catch (e) {
          data[doc.name] = {};
        }
      }
      this.dataSubject.next(data);
    } catch (e) {
      console.error('StaticDataService: Error loading YAML documents', e);
    }
  }

  getStaticData(): Observable<Record<string, any>> {
    return this.dataSubject.asObservable();
  }

  getStaticDataSnapshot(): Record<string, any> {
    return this.dataSubject.getValue();
  }
}
