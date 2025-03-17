import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { io } from 'socket.io-client';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  @ViewChild('localVideo') localVideo!: ElementRef;
  @ViewChild('remoteVideo') remoteVideo!: ElementRef;
  socket = io('http://localhost:5000');
  localStream!: MediaStream;
  peerConnection!: RTCPeerConnection;
  
  ngOnInit() {
    this.setupWebRTC();
  }

  async setupWebRTC() {
    this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    this.localVideo.nativeElement.srcObject = this.localStream;

    this.peerConnection = new RTCPeerConnection();
    this.localStream.getTracks().forEach(track => this.peerConnection.addTrack(track, this.localStream));

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit('ice-candidate', event.candidate);
      }
    };

    this.peerConnection.ontrack = (event) => {
      this.remoteVideo.nativeElement.srcObject = event.streams[0];
    };

    this.socket.on('offer', async (offer) => {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      this.socket.emit('answer', answer);
    });
    this.socket.on('answer', async (answer) => {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    });

    this.socket.on('ice-candidate', async (candidate) => {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    });
  }

  async call() {
    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);
    this.socket.emit('offer', offer);
  }
}