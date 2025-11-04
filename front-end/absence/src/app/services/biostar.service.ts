import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface BiostarDevice {
  devid: string | number;
  devnm: string;
  device_group_id?: number | null;
}

export interface BiostarDeviceGroup {
  id: number;
  name: string;
  depth?: number | null;
  _parent_id?: number | null;
}

@Injectable({ providedIn: 'root' })
export class BiostarService {
  private readonly baseUrl = `${environment.apiUrl}/biostar`;

  constructor(private http: HttpClient) {}

  getDevices(villeId: number, deviceGroupIds?: number[]): Observable<{ success: boolean; devices: BiostarDevice[] }> {
    let params = new HttpParams().set('ville_id', String(villeId));
    if (deviceGroupIds && deviceGroupIds.length > 0) {
      deviceGroupIds.forEach(id => {
        params = params.append('device_group_ids[]', String(id));
      });
    }
    return this.http.get<{ success: boolean; devices: BiostarDevice[] }>(`${this.baseUrl}/devices`, { params });
  }

  getDeviceGroups(villeId: number): Observable<{ success: boolean; groups: BiostarDeviceGroup[] }> {
    const params = new HttpParams().set('ville_id', String(villeId));
    return this.http.get<{ success: boolean; groups: BiostarDeviceGroup[] }>(`${this.baseUrl}/device-groups`, { params });
  }
}


