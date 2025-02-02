import { Injectable } from '@angular/core';
import { Observable, Observer } from 'rxjs';
import { environment } from 'src/environments/environment';

declare var gapi;

@Injectable()
export class GoogleFitService {

	public isSignedIn = false;
	public loggedInEmail = '';

	constructor() {
		gapi.load('client:auth2', () => {
			gapi.auth2.init({
				client_id: environment.client_id

			});
		});
	}

	init() {
		return new Promise((resolve, reject) => {
			try {
				this.authenticate().then(this.loadClient);
				resolve();
			} catch (error) {
				reject(error);
			}
		});
	}

	public authenticate() {
		return gapi.auth2
			.getAuthInstance()
			.signIn({
				scope: 'https://www.googleapis.com/auth/fitness.activity.read'
			})
			.then(
				() => {
					console.log('Sign-in successful');
					this.loggedInEmail = gapi.auth2.getAuthInstance().currentUser.get().getBasicProfile().getEmail()
					console.log('Logged in email', this.loggedInEmail);
					this.isSignedIn = true;
				},
				err => {
					console.error('Error signing in', err);
				}
			);
	}

	public loadClient() {
		gapi.client.setApiKey(environment.apiKey);
		return gapi.client
			.load('https://content.googleapis.com/discovery/v1/apis/fitness/v1/rest')
			.then(
				() => {
					console.log('GAPI client loaded for API');
				},
				err => {
					console.error('Error loading GAPI client for API', err);
				}
			);
	}

	checkCount(timeGap: any): Observable<any> {
		return new Observable<any>((observer: Observer<any>) => {
			return gapi.client.fitness.users.dataset
				.aggregate({
					userId: 'me',
					resource: {
						aggregateBy: [
							{
								dataTypeName: 'com.google.step_count.delta',
								dataSourceId:
									'derived:com.google.step_count.delta:com.google.android.gms:estimated_steps'
							}
						],
						endTimeMillis: timeGap.endTimeMillis,
						startTimeMillis: timeGap.startTimeMillis,
						bucketByTime: {
							durationMillis: 86400000
						}
					}
				})
				.then(
					response => {
						const stepVals = [];
						response.result.bucket.forEach(element => {
							if (element.dataset[0].point[0]) {
								stepVals.push(element.dataset[0].point[0].value[0].intVal);
							}
						});
						console.log('response', response);
						observer.next(response.result);
						observer.complete();
					},
					err => {
						console.error('Execute error', err);
						observer.error(err);
						observer.complete();

					}
				);
		});
	}

	public syncData(stepCounts: any, totalStepCount: number) {
		const requestBody = {
			steps: totalStepCount,
			syncDate: stepCounts[Object.keys(stepCounts).length - 1].dateSteps,
			playerGmail: this.loggedInEmail
		};
		console.log('req body', requestBody);
		// TODO: Call API

	}
}
